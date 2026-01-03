import express from "express";
const app = express();
import dotenv from "dotenv";
dotenv.config();
const port = process.env.PORT || 3000;
import mongoose from "mongoose";
const mongoDb_url = process.env.MONGO_DB_URL || "";
import SignupRoute from "./routes/auth/signup.js";
import SignInRoute from "./routes/auth/signin.js";
import ClassRouter from "./routes/class/route.js";
import AttandanceRouter from "./routes/attandance/route.js";
import expressWs from 'express-ws';
import Jwt, { type JwtPayload }  from "jsonwebtoken";
expressWs(app);
import Authmiddleware from "./middleware/Authmiddleware.js";
import { ActiveSessions } from "./routes/attandance/route.js";
import { AttendanceModel, classModel, userModel } from "./db/Schema.js";
import { setActiveSession, clearActiveSession } from "./routes/attandance/route.js";

app.use(express.json());
app.use("/auth", SignupRoute);
app.use("/auth", SignInRoute);
app.use("/", ClassRouter);
app.use("/", AttandanceRouter);

app.get("/", (req, res)=>{
    console.log("Default route called..");
    res.json({
        success : true,
        data : {
            message : "default route.."
        }
    });
});

app.get("/health", (req, res)=>{
    console.log("Default health route called..");
    res.json({
        success : true,
        data : {
            message : "default health route.."
        }
    });
});

try {
    await mongoose.connect(mongoDb_url);
    console.log("Connected to MongoDB!");
    
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });

} catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
}

// All ws connections packed for boradcasting
let allWsConnections : any[]= [];

//@ts-ignore
app.ws("/ws", Authmiddleware, (ws : any, req : any)=>{
    try{
        const token = req.params;

        const {userId, role} = Jwt.verify(token, process.env.JWT_SECRET || "") as JwtPayload;

        if(!ActiveSessions){
            return JSON.stringify({
                "event": "ERROR",
  "data": {
    "message": "No active attendance session"
  }
            })
        }

        ws.user = {
            userId,
            role
        }
        // the ones which are connecetd will see it here live
        allWsConnections.push(ws);

        ws.on("close", ()=>{
            allWsConnections = allWsConnections.filter(x=> x!== ws);
        })

        ws.on("message", async (msg : any)=>{
            const message = msg.toString();
            const parsedMessage = JSON.parse(message);
            switch(parsedMessage.type){
                case "ATTANDANCE_MARKED":
                    if(ws.role === "teacher" && ws.user.userId == ActiveSessions?.teacherId){
                        if(ws.user.role === "teacher"){
                            if(!ActiveSessions || ActiveSessions == null){
                                ws.send(
                                    JSON.stringify({                        
                                        event : "ERROR",
                                        data : {
                                            message : "No active attendance session"
                                        }
                                })
                            )
                            }
                             else{
                        const studentId = parsedMessage.data.studentId;
                        const status = parsedMessage.data.status;
                        
                        ActiveSessions.attandance[studentId] = status;
                        // Broad cast too all
                        allWsConnections.map(ws=>ws.send({
                           event: "ATTENDANCE_MARKED",
                           data : {
                              studentId,
                              status
                           } 
                        }));
                    }
                    }

                    }
                    else{
                        ws.send(
                                JSON.stringify({                        
                                    event : "ERROR",
                                    data : {
                                        message : "Forbidden, teacher event only"
                                    }
                                })
                        )
                    }
                break;
                case "TODAY_SUMMARY":
                    if(ws.role == "teacher" && ws.user.userId == ActiveSessions?.teacherId){
                        // Broadcast Today summary to all the connecetd nodes
                         if(ActiveSessions?.startedAt == new Date){
                            // users which belong to the classId *students
                            const userdb = await userModel.find({
                                _id : ActiveSessions.classId
                            });

                            const total = userdb.length;
                            const present = Object.keys(ActiveSessions.attandance).filter(x=> ActiveSessions?.attandance[x] == "present").length;

                            const absent = total - present;

                            // persist this to the db.. by shoving data to the attandance model

                            allWsConnections.map(ws => ws.send({
                                event : "TODAY_SUMMARY",
                                data : {
                                   present : present,
                                   absent : absent,
                                   total : total
                                }
                            }));

                         }

                    }
                     else{
                        ws.send(
                                JSON.stringify({                        
                                    event : "ERROR",
                                    data : {
                                        message : "Forbidden, teacher event only"
                                    }
                                })
                        )
                    }
                break;
                case "MY_ATTANDANCE":
                    if(ws.role == "student"){
                        const status = ActiveSessions?.attandance[ws.user.studentId];
                        
                        // Unicast to the student socket
                        ws.send({
                            event : "My_ATTANDANCE",
                            data : {
                                status
                            }
                        });
                    }
                     else{
                        ws.send(
                                JSON.stringify({                        
                                    event : "ERROR",
                                    data : {
                                        message : "Forbidden, student event only"
                                    }
                                })
                        )
                    }
                break;

                case "DONE":
                    if(ws.role == "teacher" && ws.user.userId  === ActiveSessions?.teacherId){
                        const classdb = await classModel.findOne({
                            _id : ActiveSessions?.classId
                        });

                        if(classdb == null) return;

                        const total = classdb.studentIds.length;
                        const present = Object.keys(ActiveSessions?.attandance || []).filter(x=> ActiveSessions?.attandance[x] == "present").length;

                        const absent = total - present;

                        const promise =  classdb?.studentIds.map(async (studentId) => (
                            await AttendanceModel.create({
                                 studentId,
                                 status : Object.keys(ActiveSessions?.attandance || []).find(
                                    x => x===studentId.toString()
                                 ) ? "present" : "absent"
                            })
                        )) || [];

                        Promise.all(promise);

                        // Clear the memory
                        clearActiveSession();

                        //
                        allWsConnections.map(ws=>(
                            ws.send(JSON.stringify({
                                event : "DONE",
                                data : {
                                    message : "Attandance persisted",
                                    present : present,
                                    absent : absent,
                                    total : total
                                }
                            }))
                        ))


                    }
                    else{
                         ws.send(
                                JSON.stringify({                        
                                    event : "ERROR",
                                    data : {
                                        message : "You are not a teacher"
                                    }
                                })
                        )
                    }
            }

        })
    
    }
    catch(error){
        ws.send(
            JSON.stringify({
                event : "ERROR",
                data : {
                    message : "Unauthorized or invalid token"
                }
            })
        )
        ws.close();
    }
});