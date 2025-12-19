import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { styles } from '../utils/styles';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('=== ERROR CAUGHT BY BOUNDARY ===');
    console.error('Error:', error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Error info:', errorInfo);
    console.error('Component stack:', errorInfo?.componentStack);
    console.error('================================');
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <LinearGradient
          colors={['#0F172A', '#1E3A8A', '#3B82F6']}
          style={styles.container}
        >
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Error Occurred</Text>
            <Text style={styles.errorText}>{this.state.error?.toString()}</Text>
            <Text style={styles.errorMessage}>{this.state.error?.message}</Text>
            {this.state.errorInfo?.componentStack && (
              <ScrollView style={styles.errorStack}>
                <Text style={styles.errorStackTitle}>Component Stack:</Text>
                <Text style={styles.errorStackText}>{this.state.errorInfo.componentStack}</Text>
              </ScrollView>
            )}
            {this.state.error?.stack && (
              <ScrollView style={styles.errorStack}>
                <Text style={styles.errorStackTitle}>Error Stack:</Text>
                <Text style={styles.errorStackText}>{this.state.error.stack}</Text>
              </ScrollView>
            )}
          </View>
        </LinearGradient>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

