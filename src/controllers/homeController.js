import db from '../models/index'

let getHomePage = async (req, res) => {
    try {
        let data = await db.user.findAll(); //phần này đang chưa có data
        return res.render('homepage.ejs')
    } catch (e) {
        console.log(e)
    }

}

module.exports = {
    getHomePage: getHomePage
}