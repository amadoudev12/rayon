"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });
        console.log(result)
        if (result?.error) {
            setError("Email ou mot de passe incorrect");
            return;
        }
        router.push("/dashboard");
    }
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <form
            onSubmit={handleSubmit}
            className="bg-white p-8 rounded-xl shadow-md w-96"
        >
            <h1 className="text-2xl font-bold mb-6 text-center">
                Connexion
            </h1>
            {error && (
                <p className="text-red-500 mb-4">
                    {error}
                </p>
            )}
            <div className="mb-4">
            <label className="block mb-2">
                Email
            </label>
            <input
                type="email"
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
                className="w-full border p-2 rounded"
                placeholder="exemple@gmail.com"
            />
            </div>
            <div className="mb-6">
            <label className="block mb-2">
                Mot de passe
            </label>
            <input
                type="password"
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                className="w-full border p-2 rounded"
                placeholder="********"
            />
            </div>
            <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
                Se connecter
            </button>
        </form>
        </div>
    );
}