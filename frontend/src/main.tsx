import React, { JSX } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Studio from "./pages/Studio";
import "./index.css";

function PrivateRoute({ children }: { children: JSX.Element }) {
  return localStorage.getItem("ai_token") ? children : <Navigate to="/login" />;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={<PrivateRoute><Studio /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
