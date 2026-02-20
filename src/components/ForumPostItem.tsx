'use client';

import { useState } from 'react';
import { Clock, User, ChevronDown, ChevronRight, Plus, FileText, ImageIcon, Paperclip } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { getMediaUrl } from '@/lib/mediaUrl';

interface ForumAttachment {
    id: number | null;
    file: string | null;
    position: number;
    legacy?: boolean;
}

interface ForumPost {
    id: number;
    thread: number;
    author: number;
    author_username: string;
    author_first_name: string;
    author_last_name: string;
    content: string;
    file?: string | null;
    attachments?: ForumAttachment[];
    is_answer: boolean;
    parent_post?: number | null;
    replies?: ForumPost[];
    reactions?: Record<string, number>;
    user_reactions?: string[];
    created_at: string;
    updated_at: string;
}

interface ForumPostItemProps {
    post: ForumPost;
    depth?: number;
    canAnswer: boolean;
    onReplyClick: (postId: number, authorUsername: string, content: string) => void;
    formatDate: (dateString: string) => string;
    onReactionChange?: () => void;
}

const MAX_DEPTH = 10;
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export default function ForumPostItem({
    post,
    depth = 0,
    canAnswer,
    onReplyClick,
    formatDate,
    onReactionChange,
}: ForumPostItemProps) {
    const [isExpanded, setIsExpanded] = useState(depth === 0);
    const [reactions, setReactions] = useState(post.reactions || {});
    const [userReactions, setUserReactions] = useState(post.user_reactions || []);
    const [showReactionMenu, setShowReactionMenu] = useState(false);
    const [isLoadingReaction, setIsLoadingReaction] = useState(false);

    const hasReplies = post.replies && post.replies.length > 0;

    // Check if the file is an image
    const isImageFile = (url: string | null | undefined) => {
        if (!url) return false;
        const lowercaseUrl = url.toLowerCase();
        return lowercaseUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)$/) != null;
    };

    const handleReaction = async (emoji: string) => {
        setIsLoadingReaction(true);
        try {
            await axiosInstance.post(`/forum/posts/${post.id}/react/`, {
                reaction_type: emoji,
            });

            // Toggle reaction state
            if (userReactions.includes(emoji)) {
                setUserReactions(userReactions.filter(r => r !== emoji));
                setReactions({
                    ...reactions,
                    [emoji]: (reactions[emoji] || 1) - 1,
                });
            } else {
                setUserReactions([...userReactions, emoji]);
                setReactions({
                    ...reactions,
                    [emoji]: (reactions[emoji] || 0) + 1,
                });
            }

            setShowReactionMenu(false);
            onReactionChange?.();
        } catch (err) {
            console.error('Error reacting:', err);
        } finally {
            setIsLoadingReaction(false);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex gap-0">
                {/* Vertical line and expand/collapse button */}
                <div className="flex flex-col items-center">
                    {depth > 0 && (
                        <div
                            className="w-[2px] bg-gray-300 flex-shrink-0"
                            style={{ height: '28px', marginBottom: '8px' }}
                        ></div>
                    )}
                    {hasReplies && depth < MAX_DEPTH && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0 mb-2"
                            title={isExpanded ? 'Collapse' : 'Expand'}
                        >
                            {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-600" />
                            ) : (
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                            )}
                        </button>
                    )}
                    {hasReplies && depth < MAX_DEPTH && isExpanded && (
                        <div
                            className="w-[2px] bg-gray-300 flex-shrink-0 flex-1"
                            style={{ minHeight: '100px' }}
                        ></div>
                    )}
                </div>

                {/* Post content */}
                <div className="flex-1 ml-3">
                    <div
                        className={`bg-white rounded-lg shadow-sm border p-4 transition-all ${
                            post.is_answer
                                ? 'border-green-200 bg-green-50'
                                : depth === 0
                                  ? 'border-gray-200'
                                  : 'border-gray-200 bg-gray-50'
                        }`}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                                <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <span className="font-medium text-gray-900">
                                    {post.author_first_name || post.author_last_name
                                        ? `${post.author_first_name} ${post.author_last_name}`.trim()
                                        : post.author_username}
                                </span>
                                {(post.author_first_name || post.author_last_name) && (
                                    <span className="text-xs text-gray-500">
                                        (@{post.author_username})
                                    </span>
                                )}
                                {post.is_answer && (
                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                                        Ответ преподавателя
                                    </span>
                                )}
                            </div>
                            <span className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0 ml-2">
                                <Clock className="w-3 h-3" />
                                {formatDate(post.created_at)}
                            </span>
                        </div>
                        <p className="text-gray-800 whitespace-pre-wrap text-sm mb-3">
                            {post.content}
                        </p>

                        {/* File Attachments: use attachments array (includes legacy single file) */}
                        {(post.attachments && post.attachments.length > 0 ? post.attachments : post.file ? [{ id: null, file: post.file, position: 0, legacy: true }] : []).map((att, idx) => {
                            const mediaUrl = att.file ? getMediaUrl(att.file) : '';
                            return (
                            <div key={att.id ?? `legacy-${idx}`} className="mb-3 overflow-hidden rounded-lg border border-gray-200">
                                {mediaUrl && isImageFile(att.file) ? (
                                    <div className="max-w-md">
                                        <a href={mediaUrl} target="_blank" rel="noopener noreferrer">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={mediaUrl}
                                                alt="Attached image"
                                                className="w-full h-auto object-cover max-h-96"
                                            />
                                        </a>
                                    </div>
                                ) : mediaUrl ? (
                                    <a
                                        href={mediaUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                            <FileText className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {att.file.split('/').pop()?.split('?')[0] || 'Attached File'}
                                            </p>
                                            <p className="text-xs text-blue-600">Скачать</p>
                                        </div>
                                    </a>
                                ) : null}
                            </div>
                        );})}

                        {/* Reactions Bar - Telegram style */}
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            {Object.entries(reactions)
                                .filter(([_, count]) => count > 0)
                                .map(([emoji, count]) => (
                                    <button
                                        key={emoji}
                                        onClick={() => handleReaction(emoji)}
                                        disabled={isLoadingReaction}
                                        className={`px-2 py-1 rounded-full text-sm font-medium transition-all ${
                                            userReactions.includes(emoji)
                                                ? 'bg-blue-100 text-blue-700 border border-blue-300 scale-110'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        } ${isLoadingReaction ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {emoji} {count}
                                    </button>
                                ))}

                            {/* Add Reaction Button */}
                            {canAnswer && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowReactionMenu(!showReactionMenu)}
                                        disabled={isLoadingReaction}
                                        className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-600 hover:text-gray-900"
                                        title="Add reaction"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>

                                    {/* Reaction Menu - Dropdown */}
                                    {showReactionMenu && (
                                        <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex gap-1 z-10">
                                            {REACTION_EMOJIS.map(emoji => (
                                                <button
                                                    key={emoji}
                                                    onClick={() => handleReaction(emoji)}
                                                    disabled={isLoadingReaction}
                                                    className="text-xl hover:scale-125 transition-transform hover:bg-gray-100 p-1 rounded"
                                                    title={emoji}
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="pt-2 border-t border-gray-200 flex items-center justify-between gap-2 flex-wrap">
                            {canAnswer && depth < MAX_DEPTH && (
                                <button
                                    onClick={() =>
                                        onReplyClick(post.id, post.author_username, post.content)
                                    }
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    💬 Ответить
                                </button>
                            )}
                            {hasReplies && !isExpanded && (
                                <span className="text-xs text-gray-500 ml-auto">
                                    +{post.replies!.length} ответов
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Рекурсивное отображение replies */}
                    {hasReplies && isExpanded && (
                        <div className="space-y-3 mt-3">
                            {post.replies!.map(reply => (
                                <ForumPostItem
                                    key={reply.id}
                                    post={reply}
                                    depth={depth + 1}
                                    canAnswer={canAnswer}
                                    onReplyClick={onReplyClick}
                                    formatDate={formatDate}
                                    onReactionChange={onReactionChange}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
