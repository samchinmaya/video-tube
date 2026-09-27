export class APIresponse{
    constructor(
        statusCode,
        data,
        message="success"
    ){
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = statusCode<400
    }
    json(res){
        return res.status(this.statusCode).json(this)
    }

}
