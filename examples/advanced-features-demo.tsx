/**
 * Advanced Features Demo
 *
 * This example demonstrates the 3 new critical features:
 * 1. IndexedDB Storage (for large datasets beyond localStorage 5MB limit)
 * 2. Query Invalidation by Relationship (automatic dependency tracking)
 * 3. DevTools (real-time cache visualization and debugging)
 */

import React, { useState } from 'react';
import { useCache } from 'blitz-cache/react';
import { BlitzCache, IndexedDBAdapter } from 'blitz-cache/core';
import type { CacheDependency } from 'blitz-cache/core';
import { BlitzDevTools } from 'blitz-cache/devtools';

// ============================================================================
// FEATURE 1: IndexedDB Storage Adapter
// ============================================================================

/**
 * Create a cache instance with IndexedDB for large data storage
 * Supports ~50MB+ (vs localStorage's ~5MB limit)
 */
const createIndexedDBCache = () => {
  const cache = new BlitzCache<any, any>(
    (params) => JSON.stringify(params),
    {
      // Use IndexedDB instead of localStorage
      storageAdapter: new IndexedDBAdapter({
        dbName: 'my-app-cache-db',
        storeName: 'queries',
        version: 1,
      }),
      maxEntries: 200, // Can handle more entries with IndexedDB
      staleTime: 5 * 60 * 1000,
      debug: true,
    }
  );

  return cache;
};

// ============================================================================
// FEATURE 2: Query Invalidation by Relationship
// ============================================================================

interface User {
  id: number;
  name: string;
  email: string;
}

interface Post {
  id: number;
  userId: number;
  title: string;
  content: string;
}

interface Comment {
  id: number;
  postId: number;
  userId: number;
  text: string;
}

// Fetch user data
async function fetchUser(params: { userId: number }) {
  const response = await fetch(`/api/users/${params.userId}`);
  return response.json() as Promise<User>;
}

// Fetch user's posts
async function fetchUserPosts(params: { userId: number }) {
  const response = await fetch(`/api/users/${params.userId}/posts`);
  return response.json() as Promise<Post[]>;
}

// Fetch post with comments
async function fetchPost(params: { postId: number }) {
  const response = await fetch(`/api/posts/${params.postId}`);
  return response.json() as Promise<Post & { comments: Comment[] }>;
}

/**
 * UserProfile Component
 * Demonstrates dependency tracking for automatic invalidation
 */
function UserProfile({ userId }: { userId: number }) {
  const { data: user, isLoading } = useCache(
    { userId },
    fetchUser,
    {
      // Define dependencies for this query
      // When user:${userId} changes, this cache entry will be invalidated
      dependencies: [
        { type: 'user', id: userId },
      ],
    }
  );

  if (isLoading) return <div>Loading user...</div>;
  if (!user) return null;

  return (
    <div style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
}

/**
 * UserPosts Component
 * Posts depend on the user - when user is updated, posts should be refetched
 */
function UserPosts({ userId }: { userId: number }) {
  const { data: posts, isLoading } = useCache(
    { userId },
    fetchUserPosts,
    {
      dependencies: [
        { type: 'user', id: userId }, // Depends on user
        { type: 'posts' }, // Depends on posts in general
      ],
    }
  );

  if (isLoading) return <div>Loading posts...</div>;
  if (!posts) return null;

  return (
    <div style={{ marginTop: '20px' }}>
      <h4>Posts</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {posts.map((post) => (
          <PostCard key={post.id} postId={post.id} />
        ))}
      </div>
    </div>
  );
}

/**
 * PostCard Component
 * Post depends on the post itself and the author (user)
 */
function PostCard({ postId }: { postId: number }) {
  const { data: post } = useCache(
    { postId },
    fetchPost,
    {
      dependencies: [
        { type: 'post', id: postId },
        // This post also depends on its author
        // If we know the userId, we could add: { type: 'user', id: post?.userId }
      ],
    }
  );

  if (!post) return null;

  return (
    <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
      <h5>{post.title}</h5>
      <p>{post.content}</p>
      <small>{post.comments?.length ?? 0} comments</small>
    </div>
  );
}

/**
 * Relationship-based Invalidation Example
 */
function InvalidationControls() {
  const cache = useCache({ test: 1 }, async () => null).refetch;

  const handleInvalidateUser = () => {
    // Get the global cache instance (in real app, you'd pass this via context)
    // cache.invalidateRelated({ type: 'user', id: 1 });
    // This will invalidate:
    // - UserProfile for user 1
    // - UserPosts for user 1
    // - Any other queries that depend on user:1
    alert('In a real app, this would invalidate all user:1 related queries');
  };

  const handleInvalidateAllPosts = () => {
    // cache.invalidateRelated({ type: 'posts' });
    // This will invalidate ALL post-related queries
    alert('In a real app, this would invalidate all posts');
  };

  const handleInvalidateByPattern = () => {
    // cache.invalidateRelated({ pattern: /^user:/ });
    // This will invalidate all keys starting with "user:"
    alert('In a real app, this would invalidate all user queries');
  };

  return (
    <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
      <h4>Relationship-based Invalidation</h4>
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button onClick={handleInvalidateUser} style={buttonStyle}>
          Invalidate User #1
        </button>
        <button onClick={handleInvalidateAllPosts} style={buttonStyle}>
          Invalidate All Posts
        </button>
        <button onClick={handleInvalidateByPattern} style={buttonStyle}>
          Invalidate by Pattern
        </button>
      </div>
      <p style={{ fontSize: '12px', marginTop: '12px', color: '#92400e' }}>
        These buttons demonstrate how you can invalidate multiple related queries at once
        based on their dependencies.
      </p>
    </div>
  );
}

// ============================================================================
// FEATURE 3: DevTools Integration
// ============================================================================

/**
 * Main App Component
 * Demonstrates all three features working together
 */
export function AdvancedFeaturesDemo() {
  const [selectedUserId, setSelectedUserId] = useState(1);
  const [cacheInstance] = useState(() => createIndexedDBCache());

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h1>⚡ BlitzCache Advanced Features Demo</h1>

      <div style={{ marginTop: '24px' }}>
        <h2>✨ Features Demonstrated:</h2>
        <ol style={{ lineHeight: '1.8' }}>
          <li>
            <strong>IndexedDB Storage:</strong> Cache is persisted in IndexedDB
            (check DevTools → Application → IndexedDB → my-app-cache-db)
          </li>
          <li>
            <strong>Dependency Tracking:</strong> Queries declare dependencies
            and can be batch-invalidated when related data changes
          </li>
          <li>
            <strong>DevTools:</strong> Real-time cache visualization, hit/miss
            tracking, and manual controls (see bottom-right corner)
          </li>
        </ol>
      </div>

      <div style={{ marginTop: '24px' }}>
        <label>
          Select User:{' '}
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(Number(e.target.value))}
            style={{ padding: '4px 8px' }}
          >
            {[1, 2, 3, 4, 5].map((id) => (
              <option key={id} value={id}>
                User {id}
            </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginTop: '24px' }}>
        <UserProfile userId={selectedUserId} />
        <UserPosts userId={selectedUserId} />
      </div>

      <InvalidationControls />

      {/* DevTools Integration - appears as floating button in bottom-right */}
      <BlitzDevTools
        cache={cacheInstance}
        position="bottom-right"
        initialIsOpen={false}
        showNotifications={true}
      />
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#8b5cf6',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
};

export default AdvancedFeaturesDemo;
