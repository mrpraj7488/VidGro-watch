import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Menu, X } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';

interface GlobalHeaderProps {
  title: string;
  showCoinDisplay?: boolean;
  menuVisible: boolean;
  setMenuVisible: (visible: boolean) => void;
}

export default function GlobalHeader({ 
  title, 
  showCoinDisplay = true, 
  menuVisible, 
  setMenuVisible 
}: GlobalHeaderProps) {
  const { profile } = useAuth();

  return (
    <View style={styles.header}>
      <View style={styles.leftSection}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setMenuVisible(!menuVisible)}
        >
          {menuVisible ? (
            <X size={24} color="white" />
          ) : (
            <Menu size={24} color="white" />
          )}
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
      </View>
      
      {showCoinDisplay && profile && (
        <View style={styles.coinDisplay}>
          <View style={styles.coinBadge}>
            <Text style={styles.coinIcon}>🪙</Text>
            <Text style={styles.coinText}>{profile.coins.toLocaleString()}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#800080',
    paddingTop: 50,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  coinIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  coinText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});