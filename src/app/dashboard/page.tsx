"use client"
import { useSession } from 'next-auth/react'
import React from 'react'

export default function page() {
    const {data, status} = useSession()
    console.log(data)
    if(status === "loading") {
        <div>Chargement</div>
    }
    if(!data){
        <div>Vous êtes deconnectes</div>
    }
  return (
    <div>
        Bienvenu a vous {data?.user.id}
    </div>
  )
}
