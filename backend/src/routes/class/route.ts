import express from "express";
const ClassRouter = express.Router();
import { classModel, userModel } from "../../db/Schema.js";
import Authmiddleware from "../../middleware/Authmiddleware.js";
import z from "zod";
import { requireTeacher, requireStudent } from "../../middleware/Rolemiddleware.js";
import { AttendanceModel } from "../../db/Schema.js";

const ClassObject = z.object({
    className : z.string().min(1)
});

const Addstudentobj = z.object({
    studentId : z.string()
});


ClassRouter.use(express.json())
// Create a new Class
const CreateClass = async (req : any, res : any)=>{
    try{
        const ValidatedData = ClassObject.parse(req.body);
        const data = await classModel.create({
            className : ValidatedData.className,
            teacherId : req.userId
        });

        res.status(201).json({
            success : true,
            data : {
                _id : data._id,
                className : data.className,
                teacherId : data.teacherId,
                studentIds : []
            }
        })
    }
    catch(error){
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                error: "Invalid request schema",
            });
        }
        res.status(400).json({
            success : false,
            error : `Error message`,
        });
    }
}


// Add a student to the class
const AddStudent = async (req : any, res : any)=>{
    const ValidatedData = Addstudentobj.parse(req.body);
    const {id} = req.params;
    try{
        const updateClass = await classModel.findByIdAndUpdate(id, {
            $addToSet : {studentIds : ValidatedData.studentId},
        },     { new: true });  

        if(!updateClass){
              return res.status(404).json({
                success: false,
                error: 'Class not found'
            });
        }

        res.status(200).json({
            success: true,
            data: updateClass
        });

    } 
    catch(error){
        res.status(500).json({
            success : false,
            error : `Error message`,
        });
    }
}

// Get class details
const ClassDetails = async (req : any, res : any)=>{
    const {id} = req.params;
    try{
        const classdetails = await classModel.findById({
            _id : id
        });

        if(!classdetails){
              return res.status(404).json({
                success: false,
                error: 'Class not found'
            });
        }

        res.status(200).json({
            success: true,
            data: classdetails
        });

    }
    catch(error){
        res.status(500).json({
            success : false,
            error : `Error message`,
        });
    }
}


// Get all the student details : 
const GetAllStudents = async (req : any, res : any)=>{
    try{
        const AllStudents = await userModel.find({
            role : "student"
        });

        if(!AllStudents){
            return res.status(404).json({
                success : false,
                error : "Students not found"
            })
        }

        res.status(200).json({
            success : true,
            data : AllStudents
        });

    }
    catch(error){
        res.status(500).json({
            success : false,
            error : `Error message`,
        });
    }
}


const MyAttandance = async (req : any, res : any)=>{
    const classId = req.params;
    const userId = req.userId;

    try{
        const checkAttandance = await AttendanceModel.findOne({
            classId,
            StudentId : userId
        });
        if(checkAttandance){
            res.json({
                success : true,
                data : {
                    classId : classId,
                    status : checkAttandance.status
                }
            });
        }
        else{
            res.json({
                success : true,
                data : {
                    classId : classId,
                    status : null
                }
            });
        }
    }
    catch(error){
        res.status(500).json({
            success : false,
            error : `Error message`,
        });
    }
}


ClassRouter.get("/class/:id/my-attandance", Authmiddleware, requireStudent, MyAttandance);
ClassRouter.get("/students", Authmiddleware, requireTeacher, GetAllStudents);
ClassRouter.get("/class/:id", Authmiddleware, ClassDetails);
ClassRouter.post("/class/:id/add-student", Authmiddleware,requireTeacher, AddStudent);
ClassRouter.post("/class", Authmiddleware, requireTeacher, CreateClass);

export default ClassRouter;