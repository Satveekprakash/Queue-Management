const mongoose=require("mongoose");
const alertSchema=new mongoose.Schema({
    tokenNumber:{
        type:Number,
        required:[true,"Token number is required"],
        min: [1, "Token number must be positive"],
        max: [100000, "Token number is too large"],
        validate: {
        validator: Number.isInteger,
        message: "Token number must be an integer",
      },

    },
    mobileNumber:{
        type:String,
        required:[true,"Mobile number is required"],
        trim:true,
        match: [/^\+91[6-9]\d{9}$/, "Enter a valid Indian mobile number"],
        
    },
    isActive: {
      type: Boolean,
      default: true
    },
    alertAt7Sent: {
      type: Boolean,
      default: false
    },
     alertAt2Sent: {
      type: Boolean,
      default: false
    },
     alertAt0Sent: {
      type: Boolean,
      default: false
    },
},
 { timestamps: true }
);
//prevent from race condition
alertSchema.index({ tokenNumber: 1, isActive: 1 }, { unique: true });

 const Alert=mongoose.models.Alert ||mongoose.model("Alert",alertSchema);
 module.exports=Alert;