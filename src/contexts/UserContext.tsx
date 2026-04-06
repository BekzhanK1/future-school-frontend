'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';

export interface User {
    id: string;
    username: string;
    email: string;
    role: string;
    name: string;
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    is_active?: boolean;
    created_at?: string;
    avatar?: string;
    classroom?: string;
    student_data?: {
        classrooms?: Array<{
            grade: string;
            letter: string;
        }>;
        subjects?: string[];
    };
    /** From API: require password change (e.g. after import or reset). */
    must_change_password?: boolean;
    // Note: Teachers don't have teacher_data in the current API structure
}

interface UserState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

// Action types
type UserAction =
    | { type: 'LOGIN_START' }
    | { type: 'LOGIN_SUCCESS'; payload: User }
    | { type: 'LOGIN_FAILURE'; payload: string }
    | { type: 'LOGOUT' }
    | { type: 'CLEAR_ERROR' }
    | { type: 'SET_LOADING'; payload: boolean };

// Initial state - always start with loading to prevent hydration mismatch
const initialState: UserState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
};

// Reducer function
function userReducer(state: UserState, action: UserAction): UserState {
    switch (action.type) {
        case 'LOGIN_START':
            return {
                ...state,
                isLoading: true,
                error: null,
            };
        case 'LOGIN_SUCCESS':
            return {
                ...state,
                user: action.payload,
                isAuthenticated: true,
                isLoading: false,
                error: null,
            };
        case 'LOGIN_FAILURE':
            return {
                ...state,
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: action.payload,
            };
        case 'LOGOUT':
            if (typeof window !== 'undefined') {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                localStorage.removeItem('isLoggedIn');
            }
            return {
                ...state,
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
            };
        case 'CLEAR_ERROR':
            return {
                ...state,
                error: null,
            };
        case 'SET_LOADING':
            return {
                ...state,
                isLoading: action.payload,
            };
        default:
            return state;
    }
}

const UserContext = createContext<{
    state: UserState;
    dispatch: React.Dispatch<UserAction>;
} | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(userReducer, initialState);

    useEffect(() => {
        // This effect runs only on the client side after hydration
        const loadUserFromStorage = () => {
            try {
                const accessToken = localStorage.getItem('accessToken');
                const isLoggedIn = localStorage.getItem('isLoggedIn');
                const userData = localStorage.getItem('user');

                if (accessToken && isLoggedIn === 'true' && userData) {
                    const user = JSON.parse(userData);
                    dispatch({ type: 'LOGIN_SUCCESS', payload: user });
                } else {
                    dispatch({ type: 'LOGOUT' });
                }
            } catch (error) {
                console.error('Error loading user from storage:', error);
                dispatch({ type: 'LOGOUT' });
            }
        };

        if (typeof window !== 'undefined') {
            loadUserFromStorage();
        }
    }, []);

    return (
        <UserContext.Provider value={{ state, dispatch }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    console.log(context);
    return context;
}

export function useUserState() {
    const { state } = useUser();
    return state;
}

export function useUserActions() {
    const { dispatch } = useUser();

    return {
        loginStart: () => dispatch({ type: 'LOGIN_START' }),
        loginSuccess: (user: User) =>
            dispatch({ type: 'LOGIN_SUCCESS', payload: user }),
        loginFailure: (error: string) =>
            dispatch({ type: 'LOGIN_FAILURE', payload: error }),
        logout: () => dispatch({ type: 'LOGOUT' }),
        clearError: () => dispatch({ type: 'CLEAR_ERROR' }),
        setLoading: (loading: boolean) =>
            dispatch({ type: 'SET_LOADING', payload: loading }),
    };
}
