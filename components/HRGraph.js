import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Circle, Line, Polygon } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRAPH_WIDTH = SCREEN_WIDTH - 72; // Account for padding
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

// Format seconds to mm:ss
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const HRGraph = ({ dataSamples, avgHR: providedAvgHR }) => {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [touchX, setTouchX] = useState(null);

  if (!dataSamples || dataSamples.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>No heart rate data available</Text>
      </View>
    );
  }

  // Sample data if too many points
  const sampledData = sampleData(dataSamples, MAX_POINTS);
  
  // Extract HR values
  const hrValues = sampledData.map(sample => sample.heartRate || 0);
  const maxHR = Math.max(...hrValues, 100);
  const minHR = Math.min(...hrValues, 0);

  // Y-axis starts from the lowest value, add padding only to top
  const hrRange = maxHR - minHR || 1;
  const topPadding = hrRange * 0.1;
  const adjustedMinHR = minHR; // Start from actual minimum
  const adjustedMaxHR = maxHR + topPadding;
  const adjustedRange = adjustedMaxHR - adjustedMinHR || 1;
  
  const scaleY = (GRAPH_HEIGHT - PADDING * 2) / adjustedRange;

  // Generate points with adjusted scaling
  const points = hrValues.map((hr, index) => {
    const x = (index / (hrValues.length - 1 || 1)) * (GRAPH_WIDTH - PADDING * 2) + PADDING;
    const y = GRAPH_HEIGHT - PADDING - (hr - adjustedMinHR) * scaleY;
    return `${x},${y}`;
  }).join(' ');

  // Generate filled area path (line + bottom edge)
  const bottomY = GRAPH_HEIGHT - PADDING;
  const firstX = PADDING;
  const lastX = GRAPH_WIDTH - PADDING;
  const areaPoints = `${firstX},${bottomY} ${points} ${lastX},${bottomY}`;

  // Use provided average HR or calculate from data
  const avgHR = providedAvgHR !== undefined && providedAvgHR !== null 
    ? Math.round(providedAvgHR)
    : Math.round(hrValues.reduce((sum, hr) => sum + hr, 0) / hrValues.length);

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
    const index = Math.round(ratio * (hrValues.length - 1));
    const clampedIndex = Math.max(0, Math.min(hrValues.length - 1, index));
    
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
  const selectedX = selectedIndex !== null 
    ? (selectedIndex / (hrValues.length - 1 || 1)) * (GRAPH_WIDTH - PADDING * 2) + PADDING
    : null;
  const selectedY = selectedIndex !== null
    ? GRAPH_HEIGHT - PADDING - (hrValues[selectedIndex] - adjustedMinHR) * scaleY
    : null;
  const selectedHR = selectedIndex !== null ? hrValues[selectedIndex] : null;
  const selectedTime = selectedIndex !== null && sampledData[selectedIndex] 
    ? sampledData[selectedIndex].timerDurationInSeconds 
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.avgValue}>
            {selectedHR !== null ? `${selectedHR} bpm` : `${avgHR} bpm`}
          </Text>
          {selectedTime !== null && (
            <Text style={styles.timeText}>{formatTime(selectedTime)}</Text>
          )}
        </View>
        <Text style={styles.rangeText}>
          {minHR} - {maxHR} bpm
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
            return (
              <Line
                key={ratio}
                x1={PADDING}
                y1={y}
                x2={GRAPH_WIDTH - PADDING}
                y2={y}
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="1"
              />
            );
          })}
          
          {/* Filled area under HR line */}
          <Polygon
            points={areaPoints}
            fill="rgba(239, 68, 68, 0.2)"
            stroke="none"
          />
          
          {/* HR Line */}
          <Polyline
            points={points}
            fill="none"
            stroke="#EF4444"
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
              fill="#EF4444"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          )}
          
          {/* Data points - only show for smaller datasets to avoid clutter */}
          {hrValues.length <= 100 && hrValues.map((hr, index) => {
            if (index === selectedIndex) return null; // Don't show regular point if selected
            const x = (index / (hrValues.length - 1 || 1)) * (GRAPH_WIDTH - PADDING * 2) + PADDING;
            const y = GRAPH_HEIGHT - PADDING - (hr - adjustedMinHR) * scaleY;
            return (
              <Circle
                key={index}
                cx={x}
                cy={y}
                r="2"
                fill="#EF4444"
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

export default HRGraph;

