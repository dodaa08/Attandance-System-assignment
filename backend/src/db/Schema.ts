import  mongoose, { Schema } from "mongoose";

const User = new Schema({
    email : {type : String, unique : true, required : true},
    password : {type : String, required : true},
    name : {type : String},
    role : {type : String, enum : ["teacher", "student"], required : true}
});

const Class = new Schema({
    className : {type : String, required : true},
    teacherId : {type : Schema.Types.ObjectId, required : true, ref : "User"},
    studentIds : [{
        type : Schema.Types.ObjectId, required : true, ref : "User"
    }]
});

const Attendance = new Schema({
    classId : {type : Schema.Types.ObjectId, required : true, ref : "class"},
     studentId : {
        type : Schema.Types.ObjectId, required : true, ref : "User"
    },
    status : {type : String, enum : ["present", "absent"], required : true},
});

const userModel =  mongoose.model("User", User);
const classModel =  mongoose.model("Class", Class);
const AttendanceModel =  mongoose.model("Attendance", Attendance); 

export {userModel, AttendanceModel, classModel}