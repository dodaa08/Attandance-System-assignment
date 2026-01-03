import express from "express";
const AttandanceRouter = express.Router();
import { userModel } from "../../db/Schema.js";
import Authmiddleware from "../../middleware/Authmiddleware.js";
import { requireTeacher } from "../../middleware/Rolemiddleware.js";
import { classModel } from "../../db/Schema.js";

export let ActiveSessions : {
    classId : string,
    startedAt : Date,
    attandance : Record<string, string>,
    teacherId : mongoose.Types.ObjectId
} | null = null;

export function setActiveSession(session: typeof ActiveSessions) {
    ActiveSessions = session;
}


export function clearActiveSession() {
    ActiveSessions = null;
}


import {z} from 'zod';
import type mongoose from "mongoose";

const AttandanceSchema = z.object({
    classId : z.string()
});

const StartAttandance = async (req : any, res : any)=>{
    //@ts-ignore
    const {success, data} = AttandanceSchema.parse(req.body);

    if(!success){
        res.status(400).json({
            success : false,
            error : "Inavlid request schema"
        });
    }

    try{        
        const CheckId = await classModel.findOne({
            _id : data.classId
        });

        if(!CheckId || CheckId.teacherId !== data.teacherId){
            return res.status(400).json({
                success : false,
                error : "Forbidden, not class teacher"
            });
        }

        ActiveSessions = {
            classId : CheckId._id.toString(),
            startedAt : new Date(),
            attandance : {},
            teacherId : CheckId.teacherId
        }

       

        res.json({
            success : true,
            data : {
                classId : ActiveSessions.classId,
                startedAt : ActiveSessions.startedAt
            }
        })
    }
    catch(error){
        res.status(500).json({
            success : false,
            error : `Error message`,
        });
    }
}

AttandanceRouter.get("/class/:id/", Authmiddleware, requireTeacher, StartAttandance);

export default AttandanceRouter;