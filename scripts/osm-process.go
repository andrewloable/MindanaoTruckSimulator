package main

import (
	"encoding/json"
	"encoding/xml"
	"flag"
	"fmt"
	"io"
	"math"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Configuration
var config = struct {
	Origin struct {
		Lat float64
		Lon float64
	}
	MetersPerDegreeLat float64
	MetersPerDegreeLon float64
	RoadWidths         map[string]float64
	SpeedLimits        map[string]int
}{
	Origin: struct {
		Lat float64
		Lon float64
	}{Lat: 7.5, Lon: 124.5},
	MetersPerDegreeLat: 111320,
	MetersPerDegreeLon: 109540,
	RoadWidths: map[string]float64{
		"motorway":  14,
		"trunk":     12,
		"primary":   10,
		"secondary": 8,
		"tertiary":  6,
		"default":   6,
	},
	SpeedLimits: map[string]int{
		"motorway":  100,
		"trunk":     80,
		"primary":   60,
		"secondary": 50,
		"tertiary":  40,
		"default":   40,
	},
}

// OSM XML structures
type OSM struct {
	XMLName xml.Name  `xml:"osm"`
	Nodes   []OSMNode `xml:"node"`
	Ways    []OSMWay  `xml:"way"`
}

type OSMNode struct {
	ID   int64    `xml:"id,attr"`
	Lat  float64  `xml:"lat,attr"`
	Lon  float64  `xml:"lon,attr"`
	Tags []OSMTag `xml:"tag"`
}

type OSMWay struct {
	ID       int64     `xml:"id,attr"`
	NodeRefs []OSMNd   `xml:"nd"`
	Tags     []OSMTag  `xml:"tag"`
}

type OSMNd struct {
	Ref int64 `xml:"ref,attr"`
}

type OSMTag struct {
	K string `xml:"k,attr"`
	V string `xml:"v,attr"`
}

// Processed data structures
type Node struct {
	ID  int64
	Lat float64
	Lon float64
	Ele *float64
}

type ElevationPoint struct {
	Lat float64
	Lon float64
	Ele float64
}

type POI struct {
	ID   string  `json:"id"`
	Type string  `json:"type"`
	Name *string `json:"name"`
	X    float64 `json:"x"`
	Y    float64 `json:"y"`
	Z    float64 `json:"z"`
}

type Road struct {
	ID         string      `json:"id"`
	Type       string      `json:"type"`
	Name       *string     `json:"name"`
	Width      float64     `json:"width"`
	SpeedLimit int         `json:"speedLimit"`
	Lanes      int         `json:"lanes"`
	Surface    string      `json:"surface"`
	Points     [][]float64 `json:"points"`
}

type Bounds struct {
	MinX float64 `json:"minX"`
	MaxX float64 `json:"maxX"`
	MinY float64 `json:"minY"`
	MaxY float64 `json:"maxY"`
	MinZ float64 `json:"minZ"`
	MaxZ float64 `json:"maxZ"`
}

type Meta struct {
	Origin struct {
		Lat float64 `json:"lat"`
		Lon float64 `json:"lon"`
	} `json:"origin"`
	Bounds              Bounds `json:"bounds"`
	TotalRoads          int    `json:"totalRoads"`
	TotalPoints         int    `json:"totalPoints"`
	PointsWithElevation int    `json:"pointsWithElevation"`
	TotalPOIs           int    `json:"totalPois"`
}

type RoadsOutput struct {
	Meta  Meta   `json:"meta"`
	Roads []Road `json:"roads"`
}

type POIsOutput struct {
	Origin struct {
		Lat float64 `json:"lat"`
		Lon float64 `json:"lon"`
	} `json:"origin"`
	POIs []POI `json:"pois"`
}

func main() {
	inputFile := flag.String("input", "", "Input OSM file path")
	flag.Parse()

	fmt.Println(strings.Repeat("=", 60))
	fmt.Println("Mindanao Truck Simulator - OSM Processing Tool (Go)")
	fmt.Println(strings.Repeat("=", 60))

	numCPU := runtime.NumCPU()
	runtime.GOMAXPROCS(numCPU)
	fmt.Printf("\nUsing %d CPU cores\n", numCPU)

	// Find input file
	var filePath string
	if *inputFile != "" {
		filePath = *inputFile
	} else {
		filePath = findLatestOSMFile()
	}

	if filePath == "" {
		fmt.Println("No .osm file found. Run npm run osm:download first.")
		os.Exit(1)
	}

	fmt.Println("\nInput:", filePath)

	fileInfo, err := os.Stat(filePath)
	if err != nil {
		fmt.Println("Error:", err)
		os.Exit(1)
	}
	fmt.Printf("File size: %.1f MB\n", float64(fileInfo.Size())/(1024*1024))

	startTime := time.Now()

	// Parse OSM file
	fmt.Println("\nParsing OSM file...")
	osm, err := parseOSMFile(filePath)
	if err != nil {
		fmt.Println("Error parsing OSM:", err)
		os.Exit(1)
	}
	fmt.Printf("  Parsed %d nodes, %d ways in %.1fs\n", len(osm.Nodes), len(osm.Ways), time.Since(startTime).Seconds())

	// Process nodes in parallel
	fmt.Println("\nProcessing nodes...")
	nodeStart := time.Now()
	nodes, pois, elevationPoints := processNodesParallel(osm.Nodes, numCPU)
	fmt.Printf("  Nodes: %d | POIs: %d | Elevation points: %d (%.1fs)\n",
		len(nodes), len(pois), len(elevationPoints), time.Since(nodeStart).Seconds())

	// Process ways in parallel
	fmt.Println("\nProcessing roads...")
	roadStart := time.Now()
	roads, totalPoints, pointsWithElevation := processWaysParallel(osm.Ways, nodes, elevationPoints, numCPU)
	fmt.Printf("  Roads: %d | Points: %d (%.1fs)\n", len(roads), totalPoints, time.Since(roadStart).Seconds())
	fmt.Printf("  Points with elevation: %d / %d\n", pointsWithElevation, totalPoints)

	// Calculate bounds
	bounds := calculateBounds(roads)
	if bounds.MinY != 0 || bounds.MaxY != 0 {
		fmt.Printf("  Elevation range: %.1fm to %.1fm\n", bounds.MinY, bounds.MaxY)
	}

	// Process POIs with game coordinates
	processedPOIs := processPOIs(pois, elevationPoints)

	// Prepare output
	meta := Meta{
		Bounds:              bounds,
		TotalRoads:          len(roads),
		TotalPoints:         totalPoints,
		PointsWithElevation: pointsWithElevation,
		TotalPOIs:           len(processedPOIs),
	}
	meta.Origin.Lat = config.Origin.Lat
	meta.Origin.Lon = config.Origin.Lon

	// Create output directory
	outputDir := filepath.Join(filepath.Dir(filePath), "..", "processed")
	os.MkdirAll(outputDir, 0755)

	// Save roads.json
	fmt.Println("\nSaving output...")
	roadsOutput := RoadsOutput{Meta: meta, Roads: roads}
	saveJSON(filepath.Join(outputDir, "roads.json"), roadsOutput)

	// Save pois.json
	poisOutput := POIsOutput{POIs: processedPOIs}
	poisOutput.Origin.Lat = config.Origin.Lat
	poisOutput.Origin.Lon = config.Origin.Lon
	saveJSON(filepath.Join(outputDir, "pois.json"), poisOutput)

	elapsed := time.Since(startTime).Seconds()
	fmt.Println("\nSaved to:", outputDir)
	fmt.Printf("Processing complete in %.1fs!\n", elapsed)
}

func findLatestOSMFile() string {
	rawDir := filepath.Join("data", "raw")
	files, err := os.ReadDir(rawDir)
	if err != nil {
		return ""
	}

	type fileWithTime struct {
		path    string
		modTime time.Time
	}

	var osmFiles []fileWithTime
	for _, f := range files {
		if strings.HasSuffix(f.Name(), ".osm") {
			info, err := f.Info()
			if err == nil {
				osmFiles = append(osmFiles, fileWithTime{
					path:    filepath.Join(rawDir, f.Name()),
					modTime: info.ModTime(),
				})
			}
		}
	}

	if len(osmFiles) == 0 {
		return ""
	}

	sort.Slice(osmFiles, func(i, j int) bool {
		return osmFiles[i].modTime.After(osmFiles[j].modTime)
	})

	return osmFiles[0].path
}

func parseOSMFile(filePath string) (*OSM, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	// Read entire file for faster parsing
	data, err := io.ReadAll(file)
	if err != nil {
		return nil, err
	}

	var osm OSM
	err = xml.Unmarshal(data, &osm)
	if err != nil {
		return nil, err
	}

	return &osm, nil
}

func processNodesParallel(osmNodes []OSMNode, numWorkers int) (map[int64]*Node, []POI, []ElevationPoint) {
	nodes := make(map[int64]*Node)
	var nodesMutex sync.Mutex

	var pois []POI
	var poisMutex sync.Mutex

	var elevationPoints []ElevationPoint
	var elevMutex sync.Mutex

	chunkSize := (len(osmNodes) + numWorkers - 1) / numWorkers
	var wg sync.WaitGroup

	for i := 0; i < numWorkers; i++ {
		start := i * chunkSize
		end := start + chunkSize
		if end > len(osmNodes) {
			end = len(osmNodes)
		}
		if start >= len(osmNodes) {
			break
		}

		wg.Add(1)
		go func(chunk []OSMNode) {
			defer wg.Done()

			localNodes := make(map[int64]*Node)
			var localPOIs []POI
			var localElev []ElevationPoint

			for _, n := range chunk {
				node := &Node{
					ID:  n.ID,
					Lat: n.Lat,
					Lon: n.Lon,
				}

				var name *string
				var place, amenity string

				for _, tag := range n.Tags {
					switch tag.K {
					case "ele":
						if ele, err := strconv.ParseFloat(tag.V, 64); err == nil {
							node.Ele = &ele
							localElev = append(localElev, ElevationPoint{Lat: n.Lat, Lon: n.Lon, Ele: ele})
						}
					case "name":
						nameCopy := tag.V
						name = &nameCopy
					case "place":
						place = tag.V
					case "amenity":
						amenity = tag.V
					}
				}

				localNodes[n.ID] = node

				if place == "city" || place == "town" {
					coords := toGameCoords(n.Lat, n.Lon, node.Ele)
					localPOIs = append(localPOIs, POI{
						ID:   strconv.FormatInt(n.ID, 10),
						Type: place,
						Name: name,
						X:    coords[0],
						Y:    coords[1],
						Z:    coords[2],
					})
				} else if amenity == "fuel" {
					coords := toGameCoords(n.Lat, n.Lon, node.Ele)
					defaultName := "Gas Station"
					if name == nil {
						name = &defaultName
					}
					localPOIs = append(localPOIs, POI{
						ID:   strconv.FormatInt(n.ID, 10),
						Type: "fuel",
						Name: name,
						X:    coords[0],
						Y:    coords[1],
						Z:    coords[2],
					})
				}
			}

			// Merge results
			nodesMutex.Lock()
			for k, v := range localNodes {
				nodes[k] = v
			}
			nodesMutex.Unlock()

			poisMutex.Lock()
			pois = append(pois, localPOIs...)
			poisMutex.Unlock()

			elevMutex.Lock()
			elevationPoints = append(elevationPoints, localElev...)
			elevMutex.Unlock()
		}(osmNodes[start:end])
	}

	wg.Wait()
	return nodes, pois, elevationPoints
}

func processWaysParallel(osmWays []OSMWay, nodes map[int64]*Node, elevationPoints []ElevationPoint, numWorkers int) ([]Road, int, int) {
	var roads []Road
	var roadsMutex sync.Mutex
	var totalPoints, pointsWithElevation int
	var countMutex sync.Mutex

	chunkSize := (len(osmWays) + numWorkers - 1) / numWorkers
	var wg sync.WaitGroup

	for i := 0; i < numWorkers; i++ {
		start := i * chunkSize
		end := start + chunkSize
		if end > len(osmWays) {
			end = len(osmWays)
		}
		if start >= len(osmWays) {
			break
		}

		wg.Add(1)
		go func(chunk []OSMWay) {
			defer wg.Done()

			var localRoads []Road
			localTotalPoints := 0
			localPointsWithElev := 0

			for _, way := range chunk {
				tags := make(map[string]string)
				for _, tag := range way.Tags {
					tags[tag.K] = tag.V
				}

				highway, ok := tags["highway"]
				if !ok {
					continue
				}

				var points [][]float64
				for _, nd := range way.NodeRefs {
					node, exists := nodes[nd.Ref]
					if !exists {
						continue
					}

					ele := node.Ele
					if ele == nil && len(elevationPoints) > 0 {
						interpolated := interpolateElevation(node.Lat, node.Lon, elevationPoints)
						ele = &interpolated
					}

					if ele != nil && *ele != 0 {
						localPointsWithElev++
					}

					coords := toGameCoords(node.Lat, node.Lon, ele)
					points = append(points, coords)
				}

				if len(points) < 2 {
					continue
				}

				width := config.RoadWidths[highway]
				if width == 0 {
					width = config.RoadWidths["default"]
				}

				speedLimit := config.SpeedLimits[highway]
				if speedLimit == 0 {
					speedLimit = config.SpeedLimits["default"]
				}
				if maxspeed, ok := tags["maxspeed"]; ok {
					if ms, err := strconv.Atoi(strings.TrimSuffix(maxspeed, " km/h")); err == nil {
						speedLimit = ms
					}
				}

				lanes := 2
				if lanesStr, ok := tags["lanes"]; ok {
					if l, err := strconv.Atoi(lanesStr); err == nil {
						lanes = l
					}
				}

				surface := tags["surface"]
				if surface == "" {
					surface = "asphalt"
				}

				var name *string
				if n, ok := tags["name"]; ok {
					name = &n
				} else if r, ok := tags["ref"]; ok {
					name = &r
				}

				localRoads = append(localRoads, Road{
					ID:         strconv.FormatInt(way.ID, 10),
					Type:       highway,
					Name:       name,
					Width:      width,
					SpeedLimit: speedLimit,
					Lanes:      lanes,
					Surface:    surface,
					Points:     points,
				})

				localTotalPoints += len(points)
			}

			roadsMutex.Lock()
			roads = append(roads, localRoads...)
			roadsMutex.Unlock()

			countMutex.Lock()
			totalPoints += localTotalPoints
			pointsWithElevation += localPointsWithElev
			countMutex.Unlock()
		}(osmWays[start:end])
	}

	wg.Wait()
	return roads, totalPoints, pointsWithElevation
}

func toGameCoords(lat, lon float64, ele *float64) []float64 {
	x := (lon - config.Origin.Lon) * config.MetersPerDegreeLon
	y := 0.0
	if ele != nil {
		y = *ele
	}
	z := -(lat - config.Origin.Lat) * config.MetersPerDegreeLat
	return []float64{x, y, z}
}

func interpolateElevation(lat, lon float64, elevationPoints []ElevationPoint) float64 {
	if len(elevationPoints) == 0 {
		return 0
	}

	maxDistance := 0.1
	weightSum := 0.0
	valueSum := 0.0
	foundNearby := false

	for _, ep := range elevationPoints {
		dLat := lat - ep.Lat
		dLon := lon - ep.Lon
		distance := math.Sqrt(dLat*dLat + dLon*dLon)

		if distance < 0.0001 {
			return ep.Ele
		}

		if distance < maxDistance {
			foundNearby = true
			weight := 1 / (distance * distance)
			weightSum += weight
			valueSum += weight * ep.Ele
		}
	}

	if foundNearby && weightSum > 0 {
		return valueSum / weightSum
	}

	return 0
}

func calculateBounds(roads []Road) Bounds {
	bounds := Bounds{
		MinX: math.Inf(1),
		MaxX: math.Inf(-1),
		MinY: math.Inf(1),
		MaxY: math.Inf(-1),
		MinZ: math.Inf(1),
		MaxZ: math.Inf(-1),
	}

	for _, road := range roads {
		for _, point := range road.Points {
			x, y, z := point[0], point[1], point[2]
			bounds.MinX = math.Min(bounds.MinX, x)
			bounds.MaxX = math.Max(bounds.MaxX, x)
			bounds.MinY = math.Min(bounds.MinY, y)
			bounds.MaxY = math.Max(bounds.MaxY, y)
			bounds.MinZ = math.Min(bounds.MinZ, z)
			bounds.MaxZ = math.Max(bounds.MaxZ, z)
		}
	}

	if math.IsInf(bounds.MinX, 1) {
		return Bounds{}
	}

	return bounds
}

func processPOIs(pois []POI, elevationPoints []ElevationPoint) []POI {
	// POIs are already processed with coordinates in processNodesParallel
	return pois
}

func saveJSON(filePath string, data interface{}) {
	file, err := os.Create(filePath)
	if err != nil {
		fmt.Println("Error creating file:", err)
		return
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(data); err != nil {
		fmt.Println("Error encoding JSON:", err)
	}
}
