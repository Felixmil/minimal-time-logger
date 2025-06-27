// Custom hook for timer functionality
const { useState, useEffect, useRef } = React;

export function useTimer() {
    const [_, forceUpdate] = useState(0);
    const timerRef = useRef();

    useEffect(() => {
        timerRef.current = setInterval(() => forceUpdate(x => x + 1), 1000);
        return () => clearInterval(timerRef.current);
    }, []);

    return { forceUpdate };
} 