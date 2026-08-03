'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { Sparkles } from 'lucide-react';

export default function CommentOverlay() {
  const { comments } = useStore();

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {comments.map((comment) => (
        <div
          key={comment.id}
          className="absolute flex items-start gap-2"
          style={{ 
            left: `${isNaN(comment.x) ? 0 : comment.x}px`, 
            top: `${isNaN(comment.y) ? 0 : comment.y}px` 
          }}
        >
          {comment.author === 'ai' && (
            <div className="p-1.5 bg-blue-100 rounded-full text-blue-600 shadow-sm">
              <Sparkles size={14} />
            </div>
          )}
          <div
            className={`px-3 py-2 rounded-2xl shadow-sm max-w-xs text-sm ${
              comment.author === 'ai' ? 'bg-white border border-blue-100 text-gray-800' : 'bg-gray-100 text-gray-800'
            }`}
          >
            {comment.text}
          </div>
        </div>
      ))}
    </div>
  );
}
