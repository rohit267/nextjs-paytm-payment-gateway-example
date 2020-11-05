
export default function paynow(req, res) {
    if(req.method==="POST"){
        res.send(req.body);
    }
    else{
        res.send("NO")
    }
}