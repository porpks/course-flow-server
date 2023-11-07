import { Router } from 'express'
import supabase from '../utils/db.js'

const adminRouter = Router()

adminRouter.get('/', async (req, res) => {
  try {
    let start = req.query.start - 1
    let desc = req.query.desc
    let course = req.query.course
    let end = req.query.end - 1

    const query = supabase
      .from('courses')
      .select('*,lessons(*,sublessons(*))')
      .order('course_id', { ascending: desc })

    if (course) {
      query.ilike('course_name', `%${course}%`)
    }

    if (start) {
      query.range(start, end)
    }

    const { data, error } = await query

    return res.json({
      data,
    })
  } catch (error) {
    return res
      .status(500)
      .json({ message: `Get course error message ${error.message}` })
  }
})

adminRouter.get('/course', async (req, res) => {
  try {
    let keywords = req.query.keywords

    if (keywords === undefined) {
      return res.status(400).json({
        message: 'Please send keywords parameter in the URL endpoint',
      })
    }

    const regexKeywords = keywords
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .split(/\s+/) // Split on whitespace
      .map((word) => word.replace(/\s/g, '\\s*'))
      .join(' ')

    const queryFullName = `course_name.ilike.${keywords}`
    const queryKeywords = `course_name.ilike.%${regexKeywords}%`

    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .or(`${queryFullName},${queryKeywords}`)
      .order('course_id', { ascending: true })

    return res.json({
      data: data,
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({
      message: 'An error occurred while fetching data from Supabase',
      error: error.message,
    })
  }
})

adminRouter.get('/:courseId', async (req, res) => {
  try {
    const courseId = req.params.courseId
    const { data, error } = await supabase
      .from('courses')
      .select('*,lessons(*,sublessons(sublesson_name,sublesson_id))')
      .eq('course_id', courseId)

    if (error) {
      throw error
    }

    return res.json({
      data: data[0],
    })
  } catch (error) {
    message: error
  }
})

adminRouter.post('/:courseId', async (req, res) => {
  const lessonData = { lesson_name: req.body.lesson_name }
  // try {
  //   const courseId = req.params.courseId
  //   const { data, error } = await supabase
  //     .from('courses')
  //     .select('*,lessons(*,sublessons(sublesson_name,sublesson_id))')
  //     .eq('course_id', courseId)

  //   if (error) {
  //     throw error
  //   }

  //   return res.json({
  //     data: data[0],
  //   })
  // } catch (error) {
  //   message: error
  // }
})

export default adminRouter
