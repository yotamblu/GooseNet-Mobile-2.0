import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Account for screen padding (20px each side) + container padding (16px each side) = 72px total
const CHART_WIDTH = SCREEN_WIDTH - 72;
const CHART_HEIGHT = 200;
const BAR_SPACING = 0; // No spacing between bars

// Convert min/km to mm:ss format
const formatPace = (minKm) => {
  if (!minKm || minKm === 0) return '0:00';
  const minutes = Math.floor(minKm);
  const seconds = Math.round((minKm - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const LapPaceBarChart = ({ laps }) => {
  const [selectedLap, setSelectedLap] = useState(null);
  const [containerWidth, setContainerWidth] = useState(CHART_WIDTH);

  if (!laps || laps.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>No lap data available</Text>
      </View>
    );
  }
  
  // Calculate actual chart width based on container (accounting for padding)
  const actualChartWidth = containerWidth - 24; // 12px padding on each side

  // Extract pace values
  const paceValues = laps.map(lap => lap.lapPaceInMinKm || 0);
  const maxPace = Math.max(...paceValues);
  const minPace = Math.min(...paceValues);
  const paceRange = maxPace - minPace || 1;

  // Find fastest and slowest laps
  const fastestPace = minPace;
  const slowestPace = maxPace;
  const fastestLapIndex = paceValues.indexOf(fastestPace);
  const slowestLapIndex = paceValues.indexOf(slowestPace);

  // Calculate bar dimensions - no spacing, bars fill full width
  const barWidth = actualChartWidth / laps.length;

  // Color interpolation function: orange (fastest) to green (slowest)
  const interpolateColor = (ratio) => {
    // ratio: 0 = fastest (orange), 1 = slowest (green)
    // Orange: #F97316 (249, 115, 22)
    // Green: #22C55E (34, 197, 94)
    const r = Math.round(249 + (34 - 249) * ratio);
    const g = Math.round(115 + (197 - 115) * ratio);
    const b = Math.round(22 + (94 - 22) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Calculate bar heights (inverted: lower pace = taller bar)
  // Add bottom margin to ensure slowest lap is visible
  const bottomMargin = 20;
  const maxBarHeight = CHART_HEIGHT - bottomMargin;
  const minBarHeight = 8; // Minimum height for visibility
  
  // Add a small padding to the range to ensure slowest lap has proportional height
  // This prevents the slowest lap from being too close to the ground
  const rangePadding = paceRange * 0.1; // 10% padding
  const adjustedMaxPace = maxPace + rangePadding;
  const adjustedPaceRange = adjustedMaxPace - minPace || 1;
  
  const bars = laps.map((lap, index) => {
    const pace = lap.lapPaceInMinKm || 0;
    // Invert: (adjustedMaxPace - pace) / adjustedPaceRange gives height ratio
    // Faster laps (lower pace) get taller bars
    // With padding, slowest lap will have a small but proportional height
    const heightRatio = adjustedPaceRange > 0 ? (adjustedMaxPace - pace) / adjustedPaceRange : 0.5;
    // Ensure height is never below minimum, but use proportional calculation
    const height = Math.max(minBarHeight, maxBarHeight * heightRatio);
    
    // Very short laps (< 0.3km) should be slightly thinner but still fill most space
    const isShortLap = lap.lapDistanceInKilometers < 0.3;
    const width = isShortLap ? barWidth * 0.85 : barWidth;
    // Center short laps within their allocated space
    const xOffset = isShortLap ? (barWidth - width) / 2 : 0;
    
    // Ensure bars are exactly positioned - no gaps between bars
    const x = index * barWidth + xOffset;
    
    // Calculate color based on pace (faster = more orange, slower = more green)
    // paceRatio: 0 = fastest (orange), 1 = slowest (green)
    const paceRatio = paceRange > 0 ? (pace - minPace) / paceRange : 0;
    const color = interpolateColor(paceRatio);

    return {
      index,
      height: Math.max(height, 4), // Minimum height
      width,
      x: x,
      y: CHART_HEIGHT - bottomMargin - height, // Position from top with margin
      color,
      pace,
      distance: lap.lapDistanceInKilometers,
      avgHR: lap.avgHeartRate,
      isShortLap,
    };
  });

  return (
    <View 
      style={styles.container}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        if (width > 0) {
          setContainerWidth(width);
        }
      }}
    >
      <View style={styles.svgContainer}>
        <Svg width={actualChartWidth} height={CHART_HEIGHT} viewBox={`0 0 ${actualChartWidth} ${CHART_HEIGHT}`} style={styles.svg}>
        {bars.map((bar) => {
          // For non-short laps, use full barWidth to eliminate gaps
          const actualWidth = bar.isShortLap ? bar.width : barWidth;
          const actualX = bar.isShortLap ? bar.x : (bar.index * barWidth);
          return (
            <Rect
              key={bar.index}
              x={actualX}
              y={bar.y}
              width={actualWidth}
              height={bar.height}
              fill={bar.color}
              rx={2} // Rounded corners
              ry={2}
            />
          );
        })}
      </Svg>
      </View>
      
      {/* Touchable overlays for each bar - full width and height for easier tapping */}
      <View style={[styles.barsOverlay, { width: actualChartWidth }]}>
        {bars.map((bar) => {
          const fullBarWidth = actualChartWidth / laps.length;
          // Make touchable area cover the full chart height for better usability
          // This ensures even the last few laps are easy to tap
          const touchableHeight = CHART_HEIGHT;
          const touchableTop = 0; // Start from top of chart
          
          return (
            <TouchableOpacity
              key={bar.index}
              style={[
                styles.barTouchable,
                {
                  left: bar.index * fullBarWidth,
                  top: touchableTop,
                  width: fullBarWidth,
                  height: touchableHeight,
                }
              ]}
              onPress={() => setSelectedLap(bar.index === selectedLap ? null : bar.index)}
              activeOpacity={0.7}
            />
          );
        })}
      </View>


      {/* Tooltip */}
      {selectedLap !== null && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipTitle}>Lap {selectedLap + 1}</Text>
          <Text style={styles.tooltipText}>
            Distance: {laps[selectedLap].lapDistanceInKilometers.toFixed(2)} km
          </Text>
          <Text style={styles.tooltipText}>
            Pace: {formatPace(laps[selectedLap].lapPaceInMinKm)} /km
          </Text>
          {laps[selectedLap].avgHeartRate && (
            <Text style={styles.tooltipText}>
              Avg HR: {laps[selectedLap].avgHeartRate} bpm
            </Text>
          )}
        </View>
      )}

      {/* Lap Data Table */}
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.tableColLap]}>Lap</Text>
          <Text style={[styles.tableHeaderText, styles.tableColDistance]}>Distance</Text>
          <Text style={[styles.tableHeaderText, styles.tableColPace]}>Pace</Text>
          <Text style={[styles.tableHeaderText, styles.tableColHR]}>HR</Text>
        </View>
        {laps.map((lap, index) => {
          // Calculate color for table row based on pace
          const paceRatio = paceRange > 0 ? (lap.lapPaceInMinKm - minPace) / paceRange : 0;
          const rowColor = interpolateColor(paceRatio);
          // Extract RGB values and add opacity
          const rgbMatch = rowColor.match(/\d+/g);
          const backgroundColor = rgbMatch 
            ? `rgba(${rgbMatch[0]}, ${rgbMatch[1]}, ${rgbMatch[2]}, 0.15)`
            : 'rgba(34, 197, 94, 0.15)';
          
          return (
            <View 
              key={index} 
              style={[
                styles.tableRow,
                { backgroundColor }
              ]}
            >
              <Text style={[styles.tableCell, styles.tableColLap]}>
                {index + 1}
              </Text>
              <Text style={[styles.tableCell, styles.tableColDistance]}>
                {lap.lapDistanceInKilometers.toFixed(2)} km
              </Text>
              <Text style={[styles.tableCell, styles.tableColPace]}>
                {formatPace(lap.lapPaceInMinKm)}
              </Text>
              <Text style={[styles.tableCell, styles.tableColHR]}>
                {lap.avgHeartRate || '-'}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.5)', // Dark background
    borderRadius: 8,
    padding: 12,
    position: 'relative',
    overflow: 'hidden', // Ensure content stays inside
  },
  barsOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    height: CHART_HEIGHT,
    overflow: 'visible', // Allow touchable areas to extend if needed
  },
  barTouchable: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  svgContainer: {
    width: '100%',
    height: CHART_HEIGHT,
    overflow: 'hidden',
  },
  svg: {
    overflow: 'hidden',
  },
  noDataText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  tableContainer: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tableHeaderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  tableRowFastest: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  tableRowSlowest: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
  },
  tableCell: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
  },
  tableColLap: {
    flex: 0.8,
  },
  tableColDistance: {
    flex: 1.2,
  },
  tableColPace: {
    flex: 1,
  },
  tableColHR: {
    flex: 0.8,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 1000,
    minWidth: 150,
  },
  tooltipTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  tooltipText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginBottom: 2,
  },
});

export default LapPaceBarChart;

