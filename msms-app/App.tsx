import React, { Component, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import RootNavigator from './src/navigation/RootNavigator';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: string;
};

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error: error?.message ?? 'Unknown error',
    };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('App crash caught by boundary:', error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={errStyles.container}>
          <Text style={errStyles.title}>Something went wrong</Text>
          <Text style={errStyles.message}>{this.state.error}</Text>
          <TouchableOpacity
            style={errStyles.btn}
            onPress={() => this.setState({ hasError: false, error: '' })}
          >
            <Text style={errStyles.btnText}>Tap to Recover</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const errStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 10,
  },
  message: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  btn: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <ErrorBoundary>
            <RootNavigator />
          </ErrorBoundary>
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
