import React, { useState } from 'react';
import { useChat } from '../hooks/useChat';

const backendUrl = "http://localhost:3000";

const FileUpload = () => {

    const { setFile,handleFormSubmit} = useChat();
  const handleFileChange = (event) => {
    setFile(event.target.files[0]); // Get the first file
  };


  return (
    <form onSubmit={handleFormSubmit}>
      <input type="file" onChange={handleFileChange} />
      <button type="submit">Upload File</button>
    </form>
  );
};

export default FileUpload;
