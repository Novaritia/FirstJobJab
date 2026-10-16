"use client";
import { createContext, useContext } from "react";
import type { User } from "@/lib/api";

export const UserCtx = createContext<User | null>(null);
export const useUser = () => useContext(UserCtx);
