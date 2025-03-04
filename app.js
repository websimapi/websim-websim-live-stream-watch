const { useState, useEffect, useMemo, useCallback, useRef } = React;
const { createRoot } = ReactDOM;

// Main App component
function App() {
    const [room, setRoom] = useState(null);
    const [currentPage, setCurrentPage] = useState('home');
    const [streamData, setStreamData] = useState(null);
    const [username, setUsername] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamTitle, setStreamTitle] = useState('');
    const [viewingStream, setViewingStream] = useState(null);
    const [streamVideo, setStreamVideo] = useState(null);
    const [previewStream, setPreviewStream] = useState(null);

    // Initialize the room connection
    useEffect(() => {
        const mainRoom = new WebsimSocket();
        setRoom(mainRoom);

        // Get the username
        setUsername(mainRoom.party.client.username);

        return () => {
            if (mainRoom) {
                // Clean up room connection
                mainRoom.close();
            }
        };
    }, []);

    const startStreaming = async () => {
        try {
            // Request screen capture from user
            const displayMediaOptions = {
                video: {
                    cursor: "always"
                },
                audio: true
            };
            
            const captureStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
            setPreviewStream(captureStream);
            
            // Create a new stream record
            if (room) {
                await room.collection('streams').create({
                    title: streamTitle || `${username}'s Stream`,
                    isLive: true,
                });
                
                setIsStreaming(true);
                setCurrentPage('streaming');
            }
        } catch (err) {
            console.error("Error starting stream:", err);
            alert("Failed to start stream. Please make sure you've selected a window to share.");
        }
    };

    const stopStreaming = async () => {
        // Stop all tracks in the stream
        if (previewStream) {
            previewStream.getTracks().forEach(track => track.stop());
            setPreviewStream(null);
        }
        
        // Update stream record to not live
        if (room) {
            const myStreams = room.collection('streams')
                .filter({ username: username, isLive: true })
                .getList();
                
            for (const stream of myStreams) {
                await room.collection('streams').update(stream.id, {
                    isLive: false
                });
            }
        }
        
        setIsStreaming(false);
        setCurrentPage('home');
    };

    const viewStream = (stream) => {
        setViewingStream(stream);
        setCurrentPage('view');
        
        // Connect to streamer's room
        const streamerRoom = new WebsimSocket(`stream-${stream.username}`);
        // Set up to receive stream data
        // This is where we would set up WebRTC connections
    };

    const returnHome = () => {
        setCurrentPage('home');
        setViewingStream(null);
    };

    // Render different pages based on state
    const renderContent = () => {
        switch (currentPage) {
            case 'home':
                return <HomePage room={room} onViewStream={viewStream} />;
            case 'streaming':
                return (
                    <StreamingPage 
                        stream={previewStream} 
                        title={streamTitle}
                        setStreamTitle={setStreamTitle}
                        onEndStream={stopStreaming}
                        room={room}
                    />
                );
            case 'view':
                return (
                    <ViewStreamPage 
                        stream={viewingStream} 
                        room={room}
                        onReturn={returnHome}
                    />
                );
            default:
                return <HomePage room={room} onViewStream={viewStream} />;
        }
    };

    return (
        <div className="app-container">
            <header>
                <div className="logo">Websim<span>Live</span></div>
                <div className="user-controls">
                    <img 
                        src={`https://images.websim.ai/avatar/${username}`}
                        alt="Your avatar" 
                        className="avatar"
                    />
                    <span>{username}</span>
                    {!isStreaming ? (
                        <button 
                            className="go-live-btn"
                            onClick={() => setCurrentPage('streaming')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <circle cx="8" cy="8" r="8"/>
                            </svg>
                            Go Live
                        </button>
                    ) : (
                        <button 
                            className="go-live-btn active"
                            onClick={stopStreaming}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <circle cx="8" cy="8" r="8"/>
                            </svg>
                            End Stream
                        </button>
                    )}
                </div>
            </header>
            <main>
                <div className="content-wrapper">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
}

// Home page component - shows all live streams
function HomePage({ room, onViewStream }) {
    const [liveStreams, setLiveStreams] = useState([]);
    
    useEffect(() => {
        if (room) {
            const unsubscribe = room.collection('streams')
                .filter({ isLive: true })
                .subscribe(streams => {
                    setLiveStreams(streams);
                });
                
            return () => unsubscribe();
        }
    }, [room]);

    return (
        <div>
            <h1 className="page-title">Live Streams</h1>
            {liveStreams.length > 0 ? (
                <div className="streams-grid">
                    {liveStreams.map(stream => (
                        <StreamCard 
                            key={stream.id} 
                            stream={stream} 
                            onClick={() => onViewStream(stream)}
                        />
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <h2>No Live Streams Right Now</h2>
                    <p>Be the first to go live by clicking the "Go Live" button!</p>
                </div>
            )}
        </div>
    );
}

// Stream Card Component
function StreamCard({ stream, onClick }) {
    return (
        <div className="stream-card" onClick={onClick}>
            <div className="stream-thumbnail">
                <div className="stream-placeholder">Live Content</div>
                <div className="live-badge">LIVE</div>
                <div className="viewers">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 7.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z"/>
                    </svg>
                    {/* Mock viewer count for now */}
                    {Math.floor(Math.random() * 100)}
                </div>
            </div>
            <div className="stream-info">
                <div className="streamer-row">
                    <img 
                        src={`https://images.websim.ai/avatar/${stream.username}`}
                        alt={`${stream.username}'s avatar`} 
                        className="streamer-avatar"
                    />
                    <span className="streamer-name">{stream.username}</span>
                </div>
                <div className="stream-title">{stream.title}</div>
            </div>
        </div>
    );
}

// Streaming Page Component
function StreamingPage({ stream, title, setStreamTitle, onEndStream, room }) {
    const videoRef = useRef(null);
    const [isLive, setIsLive] = useState(false);

    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream, videoRef.current]);

    const handleStartStreaming = async () => {
        try {
            // Request screen capture if not already done
            if (!stream) {
                const displayMediaOptions = {
                    video: {
                        cursor: "always"
                    },
                    audio: true
                };
                
                const captureStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
                if (videoRef.current) {
                    videoRef.current.srcObject = captureStream;
                }
            }
            
            await startBroadcast();
        } catch (err) {
            console.error("Error starting stream:", err);
            alert("Failed to start stream. Please try again.");
        }
    };

    const startBroadcast = async () => {
        // In a real implementation, this would set up WebRTC broadcasting
        
        // Create or update the stream record
        if (room) {
            await room.collection('streams').create({
                title: title || `${room.party.client.username}'s Stream`,
                isLive: true,
            });
            
            setIsLive(true);
        }
    }

    return (
        <div>
            <div className="stream-settings">
                <h2>Stream Settings</h2>
                <div className="settings-form">
                    <div className="form-group">
                        <label htmlFor="stream-title">Stream Title</label>
                        <input
                            type="text"
                            id="stream-title"
                            value={title}
                            onChange={(e) => setStreamTitle(e.target.value)}
                            placeholder="Enter a title for your stream"
                        />
                    </div>
                    
                    <div className="stream-controls">
                        {!isLive ? (
                            <button 
                                className="go-live-btn" 
                                onClick={handleStartStreaming}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <circle cx="8" cy="8" r="8"/>
                                </svg>
                                Start Streaming
                            </button>
                        ) : (
                            <button className="end-stream-btn" onClick={onEndStream}>
                                End Stream
                            </button>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="preview-container">
                {stream ? (
                    <video ref={videoRef} autoPlay muted></video>
                ) : (
                    <div>Stream preview will appear here</div>
                )}
            </div>
        </div>
    );
}

// View Stream Page Component
function ViewStreamPage({ stream, room, onReturn }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const chatRef = useRef(null);
    const [streamRoom, setStreamRoom] = useState(null);
    
    // Connect to the streamer's room
    useEffect(() => {
        if (stream) {
            const streamerRoom = new WebsimSocket(`stream-${stream.username}`);
            setStreamRoom(streamerRoom);
            
            // Subscribe to chat messages
            const unsubscribe = streamerRoom.collection('messages').subscribe(msgs => {
                setMessages(msgs);
                
                // Scroll to bottom when new messages arrive
                if (chatRef.current) {
                    chatRef.current.scrollTop = chatRef.current.scrollHeight;
                }
            });
            
            return () => {
                unsubscribe();
                streamerRoom.close();
            };
        }
    }, [stream]);

    const sendMessage = async () => {
        if (newMessage.trim() && streamRoom) {
            await streamRoom.collection('messages').create({
                text: newMessage.trim(),
            });
            setNewMessage('');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };

    if (!stream) {
        return (
            <div className="no-data-message">
                <h2>Stream not found</h2>
                <button onClick={onReturn}>Back to streams</button>
            </div>
        );
    }

    return (
        <div>
            <button onClick={onReturn} className="back-btn">
                ← Back to streams
            </button>
            
            <div className="stream-container">
                <div className="video-column">
                    <div className="video-container">
                        {/* This would be connected to the streamer's WebRTC feed */}
                        <div>Live stream content</div>
                    </div>
                    
                    <div className="stream-info-bar">
                        <img 
                            src={`https://images.websim.ai/avatar/${stream.username}`}
                            alt={`${stream.username}'s avatar`} 
                            className="streamer-avatar"
                        />
                        <div>
                            <h2>{stream.username}</h2>
                            <div>{stream.title}</div>
                        </div>
                    </div>
                </div>
                
                <div className="chat-container">
                    <div className="chat-messages" ref={chatRef}>
                        {messages.length > 0 ? (
                            messages.map(message => (
                                <div className="chat-message" key={message.id}>
                                    <img 
                                        src={`https://images.websim.ai/avatar/${message.username}`}
                                        alt={`${message.username || "User"}'s avatar`} 
                                        className="message-avatar"
                                    />
                                    <div className="message-content">
                                        <div className="message-username">{message.username}</div>
                                        <div className="message-text">{message.text}</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-chat">
                                No messages yet. Be the first to say hello!
                            </div>
                        )}
                    </div>
                    
                    <div className="chat-input-container">
                        <input
                            type="text"
                            className="chat-input"
                            placeholder="Send a message"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                        />
                        <button 
                            className="send-btn" 
                            onClick={sendMessage}
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Create root and render app
const root = createRoot(document.getElementById('app'));
root.render(<App />);