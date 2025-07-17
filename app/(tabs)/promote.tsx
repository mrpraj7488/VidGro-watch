import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { createVideoWithHold } from '../../lib/supabase';
import GlobalHeader from '../../components/GlobalHeader';
import { Link, ChevronDown, TrendingUp } from 'lucide-react-native';

export default function PromoteTab() {
  const { user, profile, refreshProfile } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [selectedViews, setSelectedViews] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const viewsOptions = [
    { label: '10 Views', value: 10 },
    { label: '25 Views', value: 25 },
    { label: '50 Views', value: 50 },
    { label: '100 Views', value: 100 },
    { label: '250 Views', value: 250 },
    { label: '500 Views', value: 500 },
    { label: '1000 Views', value: 1000 },
  ];

  const durationOptions = [
    { label: '30 seconds', value: 30 },
    { label: '45 seconds', value: 45 },
    { label: '60 seconds', value: 60 },
    { label: '90 seconds', value: 90 },
    { label: '120 seconds', value: 120 },
    { label: '180 seconds', value: 180 },
    { label: '300 seconds', value: 300 },
    { label: '600 seconds', value: 600 },
  ];

  const calculateCost = () => {
    if (!selectedViews || !selectedDuration) return 0;
    
    // Base cost calculation
    const baseCost = selectedViews * 2;
    const durationMultiplier = selectedDuration / 60; // Per minute
    const totalCost = Math.ceil(baseCost * durationMultiplier);
    
    // VIP discount
    if (profile?.is_vip) {
      return Math.ceil(totalCost * 0.9); // 10% discount
    }
    
    return totalCost;
  };

  const calculateReward = () => {
    if (!selectedDuration) return 0;
    
    // Reward based on duration
    if (selectedDuration >= 540) return 200;
    if (selectedDuration >= 480) return 150;
    if (selectedDuration >= 420) return 130;
    if (selectedDuration >= 360) return 100;
    if (selectedDuration >= 300) return 90;
    if (selectedDuration >= 240) return 70;
    if (selectedDuration >= 180) return 55;
    if (selectedDuration >= 150) return 50;
    if (selectedDuration >= 120) return 45;
    if (selectedDuration >= 90) return 35;
    if (selectedDuration >= 60) return 25;
    if (selectedDuration >= 45) return 15;
    if (selectedDuration >= 35) return 10;
    return 5;
  };

  const handlePromoteVideo = async () => {
    if (!youtubeUrl || !title || !selectedViews || !selectedDuration) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Please log in to promote videos');
      return;
    }

    const cost = calculateCost();
    const reward = calculateReward();

    if (profile && profile.coins < cost) {
      Alert.alert('Insufficient Coins', `You need ${cost} coins to promote this video. You have ${profile.coins} coins.`);
      return;
    }

    setLoading(true);
    try {
      const result = await createVideoWithHold(
        user.id,
        youtubeUrl,
        title,
        '', // description
        selectedDuration,
        cost,
        reward,
        selectedViews
      );

      if (result) {
        Alert.alert(
          'Video Promoted Successfully!',
          `Your video has been submitted for promotion. It will be available for viewers after a 10-minute hold period.`,
          [
            { text: 'OK', onPress: () => {
              // Reset form
              setYoutubeUrl('');
              setTitle('');
              setSelectedViews(null);
              setSelectedDuration(null);
              refreshProfile();
            }}
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to promote video. Please try again.');
      }
    } catch (error) {
      console.error('Error promoting video:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <GlobalHeader 
        title="Promote" 
        menuVisible={menuVisible} 
        setMenuVisible={setMenuVisible} 
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Text style={styles.label}>YouTube URL *</Text>
          <View style={styles.inputContainer}>
            <Link size={20} color="#800080" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="https://youtu.be/fCtFxT3n_l0"
              placeholderTextColor="#999"
              value={youtubeUrl}
              onChangeText={setYoutubeUrl}
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.label}>Video Title *</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter video title"
              placeholderTextColor="#999"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <Text style={styles.label}>Number of Views *</Text>
          <TouchableOpacity style={styles.dropdown}>
            <Text style={[styles.dropdownText, !selectedViews && styles.placeholder]}>
              {selectedViews ? `${selectedViews} Views` : 'Select views'}
            </Text>
            <ChevronDown size={20} color="#666" />
          </TouchableOpacity>

          <Text style={styles.label}>Set Duration (seconds) *</Text>
          <TouchableOpacity style={styles.dropdown}>
            <Text style={[styles.dropdownText, !selectedDuration && styles.placeholder]}>
              {selectedDuration ? `${selectedDuration} seconds` : 'Select duration'}
            </Text>
            <ChevronDown size={20} color="#666" />
          </TouchableOpacity>

          {selectedViews && selectedDuration && (
            <View style={styles.costContainer}>
              <View style={styles.costItem}>
                <Text style={styles.costLabel}>Cost</Text>
                <Text style={styles.costValue}>{calculateCost()} coins</Text>
              </View>
              <View style={styles.costItem}>
                <Text style={styles.costLabel}>Reward per view</Text>
                <Text style={styles.costValue}>{calculateReward()} coins</Text>
              </View>
              {profile?.is_vip && (
                <View style={styles.vipDiscount}>
                  <Text style={styles.vipDiscountText}>VIP 10% Discount Applied!</Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.promoteButton, loading && styles.buttonDisabled]}
            onPress={handlePromoteVideo}
            disabled={loading}
          >
            <TrendingUp size={20} color="white" />
            <Text style={styles.promoteButtonText}>
              {loading ? 'Promoting...' : 'Promote Video'}
            </Text>
          </TouchableOpacity>

          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>How it works:</Text>
            <Text style={styles.infoText}>
              1. Submit your YouTube video for promotion{'\n'}
              2. Your video enters a 10-minute hold period{'\n'}
              3. After the hold period, your video becomes available for viewers{'\n'}
              4. Users earn coins by watching your video{'\n'}
              5. Track your video's performance in Analytics
            </Text>
          </View>
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
  form: {
    gap: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 16,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  placeholder: {
    color: '#999',
  },
  costContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  costItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  costLabel: {
    fontSize: 16,
    color: '#666',
  },
  costValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#800080',
  },
  vipDiscount: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFD700',
    borderRadius: 8,
  },
  vipDiscountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#800080',
    textAlign: 'center',
  },
  promoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#800080',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  promoteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});