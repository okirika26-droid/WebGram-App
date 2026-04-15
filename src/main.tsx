import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // كيعيط لملف App.tsx اللي غتكريي فيه الكود ديالك
import './index.css';   // ملف التنسيقات ديالك

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
