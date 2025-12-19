import React from 'react';
import { View, useWindowDimensions, Platform } from 'react-native';
import { styles } from '../utils/styles';
import { GRID_SIZE } from '../utils/constants';

const GridOverlay = () => {
  const { width, height } = useWindowDimensions();
  
  // Don't render if dimensions aren't ready
  if (!width || !height || width === 0 || height === 0) {
    return null;
  }

  // Temporarily disable GridOverlay on Android to test content visibility
  // TODO: Re-enable once content visibility is confirmed working
  if (Platform.OS === 'android') {
    return null;
  }

  const renderGridLines = () => {
    const horizontalLines = [];
    const verticalLines = [];
    
    // Render horizontal lines
    for (let i = 0; i <= height; i += GRID_SIZE) {
      horizontalLines.push(
        <View
          key={`h-${i}`}
          style={[
            styles.gridLine,
            {
              top: i,
              width: width,
              height: 1,
            },
          ]}
        />
      );
    }
    
    // Render vertical lines
    for (let i = 0; i <= width; i += GRID_SIZE) {
      verticalLines.push(
        <View
          key={`v-${i}`}
          style={[
            styles.gridLine,
            {
              left: i,
              height: height,
              width: 1,
            },
          ]}
        />
      );
    }
    
    return [...horizontalLines, ...verticalLines];
  };

  return <View style={styles.gridContainer}>{renderGridLines()}</View>;
};

export default GridOverlay;

