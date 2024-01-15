import { createContext, useContext, useEffect, useState } from "react";

const backendUrl = "http://localhost:3000";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [recorded, setRecorded] = useState(null);

  const chat = async (message) => {
    setLoading(true);
    const data = await fetch(`${backendUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });
    const resp = (await data.json()).messages;
    console.log(resp)
    setMessages((messages) => [...messages, ...resp]);
    setLoading(false);
  };
  
  const handleFormSubmit = async (event) => {
    event.preventDefault(); // Prevent the default form submit action

    if (file) {
      const formData = new FormData();
      formData.append('wavFile', file);
        console.log(file)
      try {
        const response = await fetch(`${backendUrl}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          setRecorded(result)
          console.log('Success:', result);

        } else {
          console.error('Server error:', response.statusText);
        }
      } catch (error) {
        console.error('Network error:', error);
      }
    } else {
      console.log('No file selected.');
    }
  };

  const [cameraZoomed, setCameraZoomed] = useState(true);
  const onMessagePlayed = () => {
    setMessages((messages) => messages.slice(1));
  };

  useEffect(() => {
    if (messages.length > 0) {
      setMessage(messages[0]);
    } else {
      setMessage(null);
    }
  }, [messages]);

  return (
    <ChatContext.Provider
      value={{
        chat,
        message,
        onMessagePlayed,
        loading,
        cameraZoomed,
        setCameraZoomed,
        setFile,
        handleFormSubmit,recorded,file
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
