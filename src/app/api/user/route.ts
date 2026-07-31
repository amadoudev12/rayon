import { NextResponse } from "next/server"
import {prisma} from "../../../../lib/prisma"
import {User} from "../../../types/user"
import {hash} from "bcrypt"
export async function POST(req: Request) {
    const body: User = await req.json()
    if (!body) {
        return NextResponse.json({ message: "Veuillez renseignez les données" }, { status: 400 })
    }
    try {
        const exist = await prisma.user.findUnique({
            where: { email: body.email }
        })
        if(exist){
            return NextResponse.json({message:"Vous êtes deja inscrit"})
        }
        const hashPass = await hash(body.password, 10)
        const userCreate = await prisma.user.create({
            data:{
                nom:body.nom,
                prenom:body.prenom,
                adresse:body.adresse,
                email:body.email,
                password:hashPass
            }
        })
        if(userCreate){
            return NextResponse.json({message:"Bienvenue cher client on espere vous satisfaire"},{status:200})
        }
    } catch (err) {
        return NextResponse.json({ message: "errerur lors de l'enregistrement", err }, { status: 500 })
    }
}