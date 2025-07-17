import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, CreditCard as Edit3, Save, Trash2, Play, Pause } from 'lucide-react-native';

interface VideoData {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  duration_seconds: number;
  coin_cost: number;
  coin_reward: number;
  target_views: number;
  views_count: number;
  status: string;
  created_at: string;
}

export default function EditVideoScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const { videoId } = useLocalSearchParams();
  
  const [video, setVideo] = useState<VideoData | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (videoId && user) {
      fetchVideoData();
    }
  }, [videoId, user]);

  const fetchVideoData = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Error fetching video:', error);
        Alert.alert('Error', 'Failed to load video data');
        router.back();
        return;
      }

      setVideo(data);
      setTitle(data.title);
      setDescription(data.description || '');
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('videos')
        .update({
          title: title.trim(),
          description: description.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', videoId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error updating video:', error);
        Alert.alert('Error', 'Failed to update video');
        return;
      }

      Alert.alert('Success', 'Video updated successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!video) return;

    const newStatus = video.status === 'active' ? 'paused' : 'active';
    
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${newStatus === 'active' ? 'resume' : 'pause'} this video promotion?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => updateVideoStatus(newStatus) }
      ]
    );
  };

  const updateVideoStatus = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('videos')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', videoId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error updating status:', error);
        Alert.alert('Error', 'Failed to update video status');
        return;
      }

      setVideo(prev => prev ? { ...prev, status: newStatus } : null);
      Alert.alert('Success', `Video ${newStatus === 'active' ? 'resumed' : 'paused'} successfully`);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Something went wrong');
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Video',
      'Are you sure you want to delete this video promotion? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: confirmDelete
        }
      ]
    );
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error deleting video:', error);
        Alert.alert('Error', 'Failed to delete video');
        return;
      }

      Alert.alert('Success', 'Video deleted successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Something went wrong');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#2ECC71';
      case 'paused': return '#F39C12';
      case 'completed': return '#3498DB';
      case 'on_hold': return '#E74C3C';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'paused': return 'Paused';
      case 'completed': return 'Completed';
      case 'on_hold': return 'On Hold';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#800080', '#FF4757']} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Video</Text>
            <Edit3 size={24} color="white" />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading video data...</Text>
        </View>
      </View>
    );
  }

  if (!video) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#800080', '#FF4757']} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Video</Text>
            <Edit3 size={24} color="white" />
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Video not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#800080', '#FF4757']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Video</Text>
          <Edit3 size={24} color="white" />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statusSection}>
          <View style={styles.statusHeader}>
            <Text style={styles.sectionTitle}>Video Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(video.status) }]}>
              <Text style={styles.statusText}>{getStatusText(video.status)}</Text>
            </View>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{video.views_count}</Text>
              <Text style={styles.statLabel}>Views</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{video.target_views}</Text>
              <Text style={styles.statLabel}>Target</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{video.target_views - video.views_count}</Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
          </View>
        </View>

        <View style={styles.editSection}>
          <Text style={styles.sectionTitle}>Edit Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter video title"
              placeholderTextColor="#999"
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter video description (optional)"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.readOnlySection}>
            <Text style={styles.sectionTitle}>Video Information</Text>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>YouTube URL:</Text>
              <Text style={styles.infoValue} numberOfLines={2}>{video.youtube_url}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Duration:</Text>
              <Text style={styles.infoValue}>{video.duration_seconds} seconds</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Coin Cost:</Text>
              <Text style={styles.infoValue}>{video.coin_cost} coins</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Coin Reward:</Text>
              <Text style={styles.infoValue}>{video.coin_reward} coins per view</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Created:</Text>
              <Text style={styles.infoValue}>
                {new Date(video.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Save size={20} color="white" />
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>

          {(video.status === 'active' || video.status === 'paused') && (
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={handleToggleStatus}
            >
              {video.status === 'active' ? (
                <Pause size={20} color="#F39C12" />
              ) : (
                <Play size={20} color="#2ECC71" />
              )}
              <Text style={styles.toggleButtonText}>
                {video.status === 'active' ? 'Pause Promotion' : 'Resume Promotion'}
              </Text>
            </TouchableOpacity>
          )}

          {video.status !== 'completed' && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
            >
              <Trash2 size={20} color="#E74C3C" />
              <Text style={styles.deleteButtonText}>Delete Video</Text>
            </TouchableOpacity>
          )}
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
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#E74C3C',
  },
  statusSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  editSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  readOnlySection: {
    marginTop: 20,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  actionButtons: {
    gap: 12,
    marginBottom: 32,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#800080',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  toggleButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: '#E74C3C',
  },
  deleteButtonText: {
    color: '#E74C3C',
    fontSize: 16,
    fontWeight: '600',
  },
});