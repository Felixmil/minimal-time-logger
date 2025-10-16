// Authentication Button Component
const { useState, useEffect } = React;

export function AuthButton({ user, onSignIn, onSignOut, loading }) {
    const [isSigningIn, setIsSigningIn] = useState(false);

    const handleSignIn = async () => {
        if (isSigningIn) return;

        setIsSigningIn(true);
        try {
            await onSignIn();
        } catch (error) {
            console.error('Sign in failed:', error);
            alert('Sign in failed. Please try again.');
        } finally {
            setIsSigningIn(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await onSignOut();
        } catch (error) {
            console.error('Sign out failed:', error);
            alert('Sign out failed. Please try again.');
        }
    };

    if (loading) {
        return React.createElement('div', { className: 'auth-loading' },
            React.createElement('i', { className: 'bi bi-arrow-clockwise spin' }),
            ' Loading...'
        );
    }

    if (user) {
        return React.createElement('div', { className: 'auth-user' },
            React.createElement('div', { className: 'user-info' },
                React.createElement('img', {
                    src: user.photoURL || 'https://via.placeholder.com/24',
                    alt: user.displayName || 'User',
                    className: 'user-avatar'
                }),
                React.createElement('span', { className: 'user-name' }, user.displayName || 'User')
            ),
            React.createElement('button', {
                className: 'btn btn-outline-secondary btn-sm',
                onClick: handleSignOut,
                title: 'Sign out'
            },
                React.createElement('i', { className: 'bi bi-box-arrow-right' }),
                ' Sign Out'
            )
        );
    }

    return React.createElement('button', {
        className: 'btn btn-primary btn-sm',
        onClick: handleSignIn,
        disabled: isSigningIn
    },
        isSigningIn ?
            React.createElement('i', { className: 'bi bi-arrow-clockwise spin' }) :
            React.createElement('i', { className: 'bi bi-google' }),
        isSigningIn ? ' Signing In...' : ' Sign In with Google'
    );
}
