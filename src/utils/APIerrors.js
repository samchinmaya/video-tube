class APIError extends Error{
    constructor(
        statusCode,
        message="Something Went Wrong",
        errors=[],
        stack = "",


    ){
        super(message)
        this.statusCode = statusCode
        this.data=null
        this.message=message
        this.success = false
        this.errors = errors

        if(!stack){
            return Error.captureStackTrace(this,this.constructor)
        }this.stack=stack

    }
}
export {APIError}
