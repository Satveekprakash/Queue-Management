class ExpressError extends Error{
    constructor(status,message="Something went wrong"){
        super(message);
        this.status=status;
        this.message=message;
    }
}
module.exports=ExpressError;