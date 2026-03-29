const mongoose=require("mongoose");
const queueSchema=new mongoose.Schema({

    mrdNo:{
        type:String,
        required: [true, "MRD number is required"],
        trim:true,
        minlength:[4,"mrdno should be minimum four later"],
        maxlength:[7,"mrdno should be maximum 7 later"],
        match: [/^\d{4,7}$/, "MRD number must be 4 to 7 digits"],//only digit(4,7)range
    },
    patientName:{
       type:String,
       required: [true, "Patient name is required"],
       trim:true,
       minlength: [2, "Patient name must be at least 2 characters"],
       maxlength: [100, "Patient name is too long"],
       match: [/^[A-Za-z.\s'-]+$/, "Enter a valid patient name"],

    },
    tokenNumber:{
        type:Number,
        required: [true, "Token number is required"],
        min: [1, "Token number must be positive"],
        max:[10000,"token number is out of range"],
        unique: true,
        validate: {
         validator: Number.isInteger,
         message: "Token number must be an integer",
        }
    },
    status:{
        type:String,
        enum:["waiting","completed"],
        default:"waiting"
    }
},

    {timestamps:true}

);

// important indexing for speed improvement +biggest traffic
queueSchema.index({ status: 1, tokenNumber: 1 });
//help in avoids model overwrite error
const Queue= mongoose.models.Queue || mongoose.model("Queue", queueSchema);
module.exports=Queue;