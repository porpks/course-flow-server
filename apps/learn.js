import { Router, response } from "express";
import supabase from "../utils/db.js";

const learnRouter = Router();

learnRouter.get("/", async (req, res) => {
    const userID = Number(req.query.userID);
    const courseID = Number(req.query.courseID);

    if (!userID || !courseID) {
        return res.status(400).json({
            message: "Invalid query"
        })
    }

    try {
        const { data: courseData, error: courseError } = await supabase
            .from('courses')
            .select('course_name, course_detail, cover_img, lessons(lesson_id, lesson_name, sublessons(sublesson_id, sublesson_name,sublesson_video))')
            .eq('course_id', courseID)
            .single();

        if (courseError) {
            return res.status(404).json({ 'message': courseError });
        }

        const result = {
            ...courseData,
        }

        return res.json({
            'data': result
        });

    } catch (err) {
        return res.status(400).json({ 'Error:': err.message });
    }
});

learnRouter.get('/status', async (req, res) => {
    const userID = Number(req.query.userID);
    const courseID = Number(req.query.courseID);

    if (!userID || !courseID) {
        return res.status(400).json({
            message: "Invalid query"
        })
    }

    const { data, error } = await supabase
        .from('user_sublessons')
        .select('sublesson_id,sublesson_status, sublessons(lesson_id, lessons(course_id))')
        .eq('user_id', userID)

    if (error) {
        return res.status(404).json({ 'message': error });
    }

    if (data.length > 0) {
        const result = data.filter((item) => item.sublessons.lessons.course_id === courseID)
        const newResult = {}
        let count = 0
        let complete = 0
        result.map((item) => {
            newResult[item.sublesson_id] = item.sublesson_status
            count++
            if (item.sublesson_status === "complete") {
                complete++
            }
        })
        let percentComplete = (complete / count * 100).toFixed(2)

        if (Object.keys(newResult).length === 0) {
            return res.status(404).json({ message: 'No data found for the specified criteria.' });
        }

        return res.json({ 'data': newResult, percentComplete });
    }

    return res.status(404).json({ message: 'No data found for the specified criteria.' });
});

learnRouter.post('/status', async (req, res) => {
    const { user_id, course_id } = req.body

    const { error } = await supabase
        .from('user_courses')
        .update({ 'course_status': true })
        .eq('user_id', user_id)
        .eq('course_id', course_id)

    return res.json({ 'message': `Status course ID:${course_id} has been completed` });

})

learnRouter.put('/start', async (req, res) => {
    const userID = Number(req.query.userID);
    const sublessonID = Number(req.query.sublessonID);

    try {
        const { data, error } = await supabase
            .from('user_sublessons')
            .select('sublesson_status')
            .eq('user_id', userID)
            .eq('sublesson_id', sublessonID)
            .single()
        if (error) {
            return res.status(404).json({ 'message': error });
        }

        if (data.sublesson_status !== "complete") {
            try {
                const { data, error } = await supabase
                    .from("user_sublessons")
                    .update({
                        sublesson_status: "inprogress",
                    })
                    .eq("user_id", userID)
                    .eq("sublesson_id", sublessonID)
                if (error) {
                    return res.status(404).json({ 'message': error });
                }
            } catch (err) {
                return res.status(400).json({ 'Error:': err.message });
            }

            return res.json({ 'message': `sublesson status ID:${sublessonID} has been updated` });
        }
        else {
            return res.json({ 'message': `can not! update sublesson status ID:${sublessonID}` });
        }

    } catch (err) {
        return res.status(400).json({ 'Error:': err.message });
    }

});

learnRouter.put('/complete', async (req, res) => {
    const userID = Number(req.query.userID);
    const sublessonID = Number(req.query.sublessonID);

    try {
        const { data, error } = await supabase
            .from("user_sublessons")
            .update({
                sublesson_status: "complete",
            })
            .eq("user_id", userID)
            .eq("sublesson_id", sublessonID)

        if (error) {
            return res.status(404).json({ 'message': error });
        }

        return res.json({ 'message': `sublesson status ID:${sublessonID} has been updated` });

    } catch (err) {
        return res.status(400).json({ 'Error:': err.message });
    }

});

learnRouter.get('/videotime', async (req, res) => {
    const courseID = Number(req.query.courseID);
    const userID = Number(req.query.userID);
    if (!courseID || !userID) {
        return res.status(400).json({
            message: "Invalid query"
        });
    }

    try {
        const { data: interval, error: courseError } = await supabase
            .from('user_sublessons')
            .select('sublesson_status,sublesson_video_timestop,timestop_updated,sublessons(*,lessons(*))')
            .eq("user_id", userID)
            .eq("sublessons.lessons.course_id", courseID);


        if (!interval || interval.length === 0) {
            return res.json({ message: "There are no sublessons for the given user ID" });
        }

        const filteredSublessons = interval.filter(item => {

            if (item.sublessons.lessons && item.sublessons.lessons.course_id === courseID) {
                return true;
            } else {
                return false;
            }
        });


        filteredSublessons.sort((a, b) => new Date(b.timestop_updated) - new Date(a.timestop_updated));


        const filteredInterval = filteredSublessons.filter(dataItem => {
            return (dataItem.sublesson_video_timestop !== null)
        });

        if (filteredInterval.length === 0) {
            return res.json({ message: "No sublessons match the criteria" });
        }

        const latestSublesson = filteredInterval[0];

        latestSublesson.sublesson_id = latestSublesson.sublessons.sublesson_id;
        latestSublesson.sublesson_name = latestSublesson.sublessons.sublesson_name
        latestSublesson.course_id = latestSublesson.sublessons.lessons.course_id
        latestSublesson.sublesson_video = latestSublesson.sublessons.sublesson_video
        delete latestSublesson.sublessons;

        res.json({ data: latestSublesson });
    } catch (e) {
        res.json({ error: e });
    }
});


learnRouter.put('/videotime', async (req, res) => {
    try {
        const body = req.body;
        const currentDate = new Date();
        const { data, error } = await supabase
            .from('user_sublessons')
            .update([{
                sublesson_video_timestop: body.sublesson_video_timestop,
                timestop_updated: currentDate,
            }])
            .eq('user_id', body.user_Id)
            .eq('sublesson_id', body.sublesson_id)
            .select();

        if (error) {
            res.status(500).json({ error: 'An error occurred while updating the record.' });
        } else {
            res.status(200).json(data);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});


learnRouter.get('/videotimebyid', async (req, res) => {
    const sublesson_id = Number(req.query.sublessonid);
    const userid = Number(req.query.userid);
    try {
        const { data: interval, error: courseError } = await supabase
            .from('user_sublessons')
            .select('sublesson_video_timestop')
            .eq("sublesson_id", sublesson_id)
            .eq("user_id", userid)


        res.json({ data: interval });
    } catch (e) {
        res.json({ error: e });
    }
});
export default learnRouter;
