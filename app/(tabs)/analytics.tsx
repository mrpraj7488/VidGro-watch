import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import GlobalHeader from '../../components/GlobalHeader';
import { Video, Coins, RefreshCw } from 'lucide-react-native';

interface AnalyticsData {
  total_videos_promoted: number;
  total_coins_earned: number;
  total_coins_spent: number;
  total_views_received: number;
  total_watch_time: number;
  active_videos: number;
  completed_videos: number;
  on_hold_videos: number;
}

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

export default function AnalyticsTab() {
  const { user, profile } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recentActivity, setRecentActivity] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    if (!user) return;

    try {
      // Fetch user analytics summary
      const { data: analyticsData, error: analyticsError } = await supabase
        .rpc('get_user_analytics_summary', { user_uuid: user.id });

      if (analyticsError) {
        console.error('Error fetching analytics:', analyticsError);
      } else {
        setAnalytics(analyticsData[0] || {
          total_videos_promoted: 0,
          total_coins_earned: 0,
          total_coins_spent: 0,
          total_views_received: 0,
          total_watch_time: 0,
          active_videos: 0,
          completed_videos: 0,
          on_hold_videos: 0,
        });
      }

      // Fetch recent activity
      const { data: activityData, error: activityError } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (activityError) {
        console.error('Error fetching activity:', activityError);
      } else {
        setRecentActivity(activityData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'video_watch':
        return '+';
      case 'video_promotion':
        return '-';
      case 'purchase':
        return '+';
      case 'referral_bonus':
        return '+';
      default:
        return '•';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'video_watch':
      case 'purchase':
      case 'referral_bonus':
        return '#2ECC71';
      case 'video_promotion':
        return '#E74C3C';
      default:
        return '#666';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <GlobalHeader 
          title="Analytics" 
          menuVisible={menuVisible} 
          setMenuVisible={setMenuVisible} 
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GlobalHeader 
        title="Analytics" 
        menuVisible={menuVisible} 
        setMenuVisible={setMenuVisible} 
      />
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Video size={24} color="#800080" />
            </View>
            <Text style={styles.statNumber}>{analytics?.total_videos_promoted || 0}</Text>
            <Text style={styles.statLabel}>Videos Promoted</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconGreen}>
              <Coins size={24} color="#2ECC71" />
            </View>
            <Text style={styles.statNumber}>{analytics?.total_coins_earned || 0}</Text>
            <Text style={styles.statLabel}>Coins Earned</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Promoted Videos</Text>
            <TouchableOpacity onPress={onRefresh}>
              <RefreshCw size={20} color="#800080" />
            </TouchableOpacity>
          </View>

          <View style={styles.promotedVideosContainer}>
            {analytics && (analytics.total_videos_promoted > 0) ? (
              <View style={styles.videoStats}>
                <View style={styles.videoStatItem}>
                  <Text style={styles.videoStatNumber}>{analytics.active_videos}</Text>
                  <Text style={styles.videoStatLabel}>Active</Text>
                </View>
                <View style={styles.videoStatItem}>
                  <Text style={styles.videoStatNumber}>{analytics.on_hold_videos}</Text>
                  <Text style={styles.videoStatLabel}>On Hold</Text>
                </View>
                <View style={styles.videoStatItem}>
                  <Text style={styles.videoStatNumber}>{analytics.completed_videos}</Text>
                  <Text style={styles.videoStatLabel}>Completed</Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Video size={48} color="#CCC" />
                <Text style={styles.emptyStateTitle}>No promoted videos</Text>
                <Text style={styles.emptyStateText}>
                  Go to the Promote tab to start promoting your videos
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          
          {recentActivity.length > 0 ? (
            <View style={styles.activityContainer}>
              {recentActivity.map((transaction) => (
                <View key={transaction.id} style={styles.activityItem}>
                  <View style={styles.activityLeft}>
                    <Text style={styles.activityDescription}>
                      {transaction.description}
                    </Text>
                    <Text style={styles.activityDate}>
                      {formatDate(transaction.created_at)}
                    </Text>
                  </View>
                  <View style={styles.activityRight}>
                    <Text style={[
                      styles.activityAmount,
                      { color: getTransactionColor(transaction.transaction_type) }
                    ]}>
                      {getTransactionIcon(transaction.transaction_type)}
                      <Text style={styles.coinEmoji}>🪙</Text>
                      {Math.abs(transaction.amount)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyActivity}>
              <Text style={styles.emptyActivityText}>No recent activity</Text>
            </View>
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
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3E5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconGreen: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  promotedVideosContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  videoStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  videoStatItem: {
    alignItems: 'center',
  },
  videoStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  videoStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  activityContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  activityLeft: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  activityDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  activityRight: {
    alignItems: 'flex-end',
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: '600',
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinEmoji: {
    fontSize: 14,
    marginHorizontal: 2,
  },
  emptyActivity: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyActivityText: {
    fontSize: 16,
    color: '#666',
  },
});