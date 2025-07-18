import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import GlobalHeader from '../../components/GlobalHeader';
import { 
  DollarSign, 
  Crown, 
  Gift, 
  ShieldOff, 
  Star, 
  Share2, 
  Shield, 
  FileText, 
  Globe, 
  Settings, 
  MessageCircle, 
  LogOut, 
  Trash2,
  User,
  X
} from 'lucide-react-native';

export default function MoreTab() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const handleItemPress = (item: any) => {
    if (item.action === 'logout') {
      handleLogout();
    } else if (item.action === 'tap') {
      // Handle tap action for Free Coins
      return;
    } else if (item.route) {
      router.push(item.route);
    }
  };

          onPress={() => setMenuVisible(false)}
        >
          <X size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.sideMenuContent}>
        {sideMenuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.sideMenuItem}
            onPress={() => handleItemPress(item)}
          >
            <item.icon size={20} color={item.color || '#800080'} />
            <Text style={[styles.sideMenuText, item.color && { color: item.color }]}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <GlobalHeader 
        title="More" 
        menuVisible={menuVisible} 
        setMenuVisible={setMenuVisible} 
      />
      
      {renderSideMenu()}
      
      {menuVisible && (
        <TouchableOpacity 
          style={styles.overlay}
          onPress={() => setMenuVisible(false)}
        />
      )}
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                item.action === 'tap' && styles.menuItemTap
              ]}
              onPress={() => handleItemPress(item)}
            >
              <View style={styles.menuItemIcon}>
                <item.icon size={24} color="#FFD700" />
              </View>
              <Text style={styles.menuItemTitle}>{item.title}</Text>
              <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
              {item.action === 'tap' && (
                <View style={styles.tapBadge}>
                  <Text style={styles.tapBadgeText}>TAP</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  menuGrid: {
    gap: 16,
  },
  menuItem: {
    backgroundColor: '#800080',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItemTap: {
    position: 'relative',
  },
  menuItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    flex: 1,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tapBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tapBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#800080',
  },
  sideMenu: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 300,
    backgroundColor: 'white',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  sideMenuHeader: {
    backgroundColor: '#800080',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  closeButton: {
    padding: 8,
  },
  sideMenuContent: {
    flex: 1,
  },
  sideMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sideMenuText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
});