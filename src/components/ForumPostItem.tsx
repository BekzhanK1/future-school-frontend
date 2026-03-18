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
                            className="w-[2px] bg-gray-200 flex-shrink-0"
                            style={{ height: '28px', marginBottom: '8px' }}
                        ></div>
                    )}
                    {hasReplies && depth < MAX_DEPTH && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="mb-2 flex-shrink-0 rounded-lg border border-gray-200 bg-white p-1 text-gray-600 transition-colors hover:bg-gray-100"
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
                            className="w-[2px] bg-gray-200 flex-shrink-0 flex-1"
                            style={{ minHeight: '100px' }}
                        ></div>
                    )}
                </div>

                {/* Post content */}
                <div className="flex-1 ml-3">
                    <div
                        className={`rounded-2xl border p-4 shadow-sm transition-all ${
                            post.is_answer
                                ? 'border-emerald-200 bg-emerald-50/60'
                                : depth === 0
                                  ? 'border-gray-100 bg-white'
                                  : 'border-gray-100 bg-gray-50/70'
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
                                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
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
                            const fileName = att.file
                                ? att.file.split('/').pop()?.split('?')[0] || 'Attached File'
                                : 'Attached File';
                            return (
                            <div key={att.id ?? `legacy-${idx}`} className="mb-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
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
                                        className="flex items-center gap-3 bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                                    >
                                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-violet-100">
                                            <FileText className="h-5 w-5 text-violet-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {fileName}
                                            </p>
                                            <p className="text-xs text-violet-600">Скачать</p>
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
                                        className={`rounded-full px-2 py-1 text-sm font-medium transition-all ${
                                            userReactions.includes(emoji)
                                                ? 'scale-110 border border-violet-300 bg-violet-100 text-violet-700'
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
                                        className="rounded-full p-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                                        title="Add reaction"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>

                                    {/* Reaction Menu - Dropdown */}
                                    {showReactionMenu && (
                                        <div className="absolute bottom-full left-0 z-10 mb-2 flex gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
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
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-2">
                            {canAnswer && depth < MAX_DEPTH && (
                                <button
                                    onClick={() =>
                                        onReplyClick(post.id, post.author_username, post.content)
                                    }
                                    className="text-xs font-semibold text-violet-600 transition-colors hover:text-violet-700"
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
