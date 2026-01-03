import type { Response, NextFunction, Request } from "express";
import  jwt, { type JwtPayload }  from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
const jwt_secret = process.env.JWT_SECRET || "";


const Authmiddleware = async (req : Request, res : Response, next : NextFunction)=>{
    const token = req.header('authorization');

    if (!token) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized, token missing or invalid"
    });
  }

  try{
    const {userId, role} = jwt.verify(token, jwt_secret) as JwtPayload;
    req.userId = userId;
    req.role = role;
    next();
  }
  catch(error){
      return res.status(401).json({
            success: false,
            error: "Unauthorized, token missing or invalid"
        });
  }
}

export default Authmiddleware;