import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Circle, Line, Polygon } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRAPH_WIDTH = SCREEN_WIDTH - 72;
const GRAPH_HEIGHT = 200; // Increased height for better visibility
const PADDING = 24; // Increased padding
const MAX_POINTS = 400; // Maximum points to render for performance

// Smart sampling: reduce data points if too many
const sampleData = (data, maxPoints) => {
  if (data.length <= maxPoints) return data;
  
  const step = Math.ceil(data.length / maxPoints);
  const sampled = [];
  for (let i = 0; i < data.length; i += step) {
    sampled.push(data[i]);
  }
  // Always include the last point
  if (sampled[sampled.length - 1] !== data[data.length - 1]) {
    sampled.push(data[data.length - 1]);
  }
  return sampled;
};

// Convert m/s to min/km
const msToMinKm = (ms) => {
  if (!ms || ms === 0) return 999; // Very slow pace
  const secondsPerKm = 1000 / ms;
  return secondsPerKm / 60; // Convert to minutes per km
};

// Convert min/km to mm:ss format
const formatPace = (minKm) => {
  const minutes = Math.floor(minKm);
  const seconds = Math.round((minKm - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Format seconds to mm:ss
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const PaceGraph = ({ dataSamples, avgPace: providedAvgPace }) => {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [touchX, setTouchX] = useState(null);

  if (!dataSamples || dataSamples.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>No pace data available</Text>
      </View>
    );
  }

  // Sample data if too many points
  const sampledData = sampleData(dataSamples, MAX_POINTS);
  
  // Convert speed to pace (min/km) - lower values are faster
  const paceValues = sampledData.map(sample => msToMinKm(sample.speedMetersPerSecond || 0));
  
  // Filter out invalid paces (too slow/fast)
  const validPaces = paceValues.filter(p => p > 0 && p < 20);
  
  if (validPaces.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>No valid pace data available</Text>
      </View>
    );
  }

  const maxPace = Math.max(...validPaces);
  const minPace = Math.min(...validPaces);

  // Add padding to Y-axis range (10% on each side) for better visualization
  const paceRange = maxPace - minPace || 1;
  const yPadding = paceRange * 0.1;
  const adjustedMinPace = Math.max(0, minPace - yPadding);
  const adjustedMaxPace = maxPace + yPadding;
  const adjustedRange = adjustedMaxPace - adjustedMinPace || 1;
  
  // Invert scale: faster (lower pace) should be higher on graph
  // We'll use inverted Y axis where lower pace values map to higher Y positions
  const scaleY = (GRAPH_HEIGHT - PADDING * 2) / adjustedRange;

  // Helper to get valid pace for an index
  const getValidPace = (pace, index) => {
    if (pace <= 0 || pace >= 20) {
      // Find nearest valid pace
      let nearestValid = validPaces[0];
      for (let i = 0; i < validPaces.length; i++) {
        if (Math.abs(validPaces[i] - pace) < Math.abs(nearestValid - pace)) {
          nearestValid = validPaces[i];
        }
      }
      return nearestValid;
    }
    return pace;
  };

  // Generate points (inverted: lower pace = higher Y)
  const points = paceValues.map((pace, index) => {
    const validPace = getValidPace(pace, index);
    const x = (index / (paceValues.length - 1 || 1)) * (GRAPH_WIDTH - PADDING * 2) + PADDING;
    // Inverted: adjustedMaxPace (slowest) at bottom, adjustedMinPace (fastest) at top
    const y = GRAPH_HEIGHT - PADDING - (adjustedMaxPace - validPace) * scaleY;
    return `${x},${y}`;
  }).join(' ');

  // Generate filled area path (line + bottom edge)
  const bottomY = GRAPH_HEIGHT - PADDING;
  const firstX = PADDING;
  const lastX = GRAPH_WIDTH - PADDING;
  const areaPoints = `${firstX},${bottomY} ${points} ${lastX},${bottomY}`;

  // Use provided average pace or calculate from data
  const avgPace = providedAvgPace !== undefined && providedAvgPace !== null
    ? providedAvgPace
    : validPaces.reduce((sum, pace) => sum + pace, 0) / validPaces.length;

  // Handle touch events
  const handleTouch = (event) => {
    const { locationX } = event.nativeEvent;
    const graphWidth = GRAPH_WIDTH - PADDING * 2;
    const relativeX = locationX - PADDING;
    
    if (relativeX < 0 || relativeX > graphWidth) {
      setSelectedIndex(null);
      setTouchX(null);
      return;
    }
    
    // Find the closest data point
    const ratio = relativeX / graphWidth;
    const index = Math.round(ratio * (paceValues.length - 1));
    const clampedIndex = Math.max(0, Math.min(paceValues.length - 1, index));
    
    setSelectedIndex(clampedIndex);
    setTouchX(locationX);
  };

  const handleTouchEnd = () => {
    // Keep the selection visible for a moment, then clear
    setTimeout(() => {
      setSelectedIndex(null);
      setTouchX(null);
    }, 2000);
  };

  // Calculate position for selected point
  const selectedPace = selectedIndex !== null ? getValidPace(paceValues[selectedIndex], selectedIndex) : null;
  const selectedX = selectedIndex !== null 
    ? (selectedIndex / (paceValues.length - 1 || 1)) * (GRAPH_WIDTH - PADDING * 2) + PADDING
    : null;
  const selectedY = selectedIndex !== null && selectedPace !== null
    ? GRAPH_HEIGHT - PADDING - (adjustedMaxPace - selectedPace) * scaleY
    : null;
  const selectedTime = selectedIndex !== null && sampledData[selectedIndex] 
    ? sampledData[selectedIndex].timerDurationInSeconds 
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.avgValue}>
            {selectedPace !== null ? formatPace(selectedPace) : formatPace(avgPace)} /km
          </Text>
          {selectedTime !== null && (
            <Text style={styles.timeText}>{formatTime(selectedTime)}</Text>
          )}
        </View>
        <Text style={styles.rangeText}>
          {formatPace(minPace)} - {formatPace(maxPace)} /km
        </Text>
      </View>
      <View
        onTouchStart={handleTouch}
        onTouchMove={handleTouch}
        onTouchEnd={handleTouchEnd}
        style={styles.touchArea}
      >
        <Svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = PADDING + (GRAPH_HEIGHT - PADDING * 2) * (1 - ratio);
            const paceValue = maxPace - paceRange * ratio;
            return (
              <React.Fragment key={ratio}>
                <Line
                  x1={PADDING}
                  y1={y}
                  x2={GRAPH_WIDTH - PADDING}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="1"
                />
              </React.Fragment>
            );
          })}
          
          {/* Filled area under pace line */}
          <Polygon
            points={areaPoints}
            fill="rgba(16, 185, 129, 0.2)"
            stroke="none"
          />
          
          {/* Pace Line */}
          <Polyline
            points={points}
            fill="none"
            stroke="#10B981"
            strokeWidth="2"
          />
          
          {/* Vertical indicator line */}
          {selectedX !== null && (
            <Line
              x1={selectedX}
              y1={PADDING}
              x2={selectedX}
              y2={GRAPH_HEIGHT - PADDING}
              stroke="rgba(255, 255, 255, 0.5)"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          )}
          
          {/* Selected point indicator */}
          {selectedX !== null && selectedY !== null && (
            <Circle
              cx={selectedX}
              cy={selectedY}
              r="5"
              fill="#10B981"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          )}
          
          {/* Data points - only show for smaller datasets to avoid clutter */}
          {paceValues.length <= 100 && paceValues.map((pace, index) => {
            if (index === selectedIndex) return null; // Don't show regular point if selected
            const validPace = getValidPace(pace, index);
            const x = (index / (paceValues.length - 1 || 1)) * (GRAPH_WIDTH - PADDING * 2) + PADDING;
            const y = GRAPH_HEIGHT - PADDING - (adjustedMaxPace - validPace) * scaleY;
            return (
              <Circle
                key={index}
                cx={x}
                cy={y}
                r="2"
                fill="#10B981"
              />
            );
          })}
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  touchArea: {
    width: GRAPH_WIDTH,
    height: GRAPH_HEIGHT,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  avgValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  rangeText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  timeText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    marginTop: 2,
  },
  noDataText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
});

export default PaceGraph;

