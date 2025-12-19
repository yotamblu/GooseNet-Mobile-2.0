import React from 'react';
import { View, Text } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { styles } from '../utils/styles';

const SleepDataComponent = () => {
  const sleepData = [
    { label: 'Deep Sleep', value: 120, color: '#1E3A8A' },
    { label: 'Light Sleep', value: 240, color: '#2563EB' },
    { label: 'REM Sleep', value: 90, color: '#3B82F6' },
    { label: 'Awake', value: 30, color: '#F97316' },
  ];
  
  const total = sleepData.reduce((sum, item) => sum + item.value, 0);
  const size = 200;
  const radius = 80;
  const center = size / 2;

  // Create pie slices
  const createPieSlice = (startAngle, endAngle, color) => {
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);
    
    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);
    
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    
    const d = [
      `M ${center} ${center}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');
    
    return d;
  };

  let currentAngle = 0;
  const slices = sleepData.map((item, index) => {
    const sliceAngle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;
    
    return {
      ...item,
      startAngle,
      endAngle,
      percentage: Math.round((item.value / total) * 100),
    };
  });

  return (
    <View style={styles.sleepDataContainer}>
      <Text style={styles.sleepDataTitle}>Sleep Breakdown</Text>
      
      {/* Pie Chart */}
      <View style={styles.pieChartContainer}>
        <Svg width={size} height={size}>
          <G>
            {slices.map((slice, index) => (
              <Path
                key={index}
                d={createPieSlice(slice.startAngle, slice.endAngle, slice.color)}
                fill={slice.color}
                stroke="#0F172A"
                strokeWidth={2}
              />
            ))}
            {/* Center circle for donut effect */}
            <Circle cx={center} cy={center} r={40} fill="#0F172A" />
          </G>
        </Svg>
        
        {/* Center text */}
        <View style={styles.pieChartCenter}>
          <Text style={styles.pieChartCenterValue}>{Math.round(total / 60)}h</Text>
          <Text style={styles.pieChartCenterLabel}>Total</Text>
        </View>
      </View>
      
      {/* Legend */}
      <View style={styles.sleepLegend}>
        {slices.map((item, index) => (
          <View key={index} style={styles.sleepLegendItem}>
            <View style={[styles.sleepColorBox, { backgroundColor: item.color }]} />
            <Text style={styles.sleepLegendText}>
              {item.label}: {item.percentage}% ({item.value} min)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default SleepDataComponent;
