const Alert = require("../models/alert");
const Queue = require("../models/queue");
const sendSMS = require("./sendSMS");

async function checkAndSendAlerts(){
    try{
        //get all active alerts
        const alerts=await Alert.find({isActive:true})
        //loop
        for (const alert of alerts) {
        // Find patient in queue
            const patient = await Queue.findOne({
            tokenNumber: alert.tokenNumber,
            status: "waiting"
         });

        // If patient is not in queue anymore → deactivate alert
        if (!patient) {
           alert.isActive = false;
            await alert.save();
            continue;
        }
        //count patient ahead
        const patientAhead=await Queue.countDocuments({
            status:"waiting",
            tokenNumber:{$lt:patient.tokenNumber}
        })
        if(patientAhead==7 && !alert.alertAt7sent){
            await sendSMS(
                alert.mobileNumber,
                 `Clinic Update: There are 7 patients ahead of your token ${alert.tokenNumber}. Please be ready.`
            );
            alert.alertAt7sent=true;

        }
        if(patientAhead==2 && !alert.alertAt2sent){
            await sendSMS(
                alert.mobileNumber,
                 `Clinic Update: There are 2 patients ahead of your token ${alert.tokenNumber}. Please stay nearby.`
            );
            alert.alertAt2sent=true;

        }
        if(patientAhead==0 && !alert.alertAt0sent){
            await sendSMS(
                alert.mobileNumber,
                 `Clinic Update: It is now your turn for token ${alert.tokenNumber}. Please proceed to doctor.`
            );
            alert.alertAt0sent=true;

        }
        await alert.save();
    
    
    
    
    }

    }catch(e){
         console.log("alert system error:",e.message)
    }
}
module.exports=checkAndSendAlerts;