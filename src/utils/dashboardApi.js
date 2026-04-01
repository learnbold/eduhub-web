const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const buildErrorMessage = (payload, fallbackMessage) => {
  if (payload?.message) {
    return payload.message
  }

  if (payload?.error) {
    return payload.error
  }

  return fallbackMessage
}

const buildDisplayName = (person) => {
  if (!person) {
    return ''
  }

  return (
    person.preferredName ||
    [person.firstName, person.lastName].filter(Boolean).join(' ').trim() ||
    person.username ||
    person.email ||
    'Sparklass Member'
  )
}

export const normalizeMember = (member) => {
  if (!member) {
    return null
  }

  return {
    ...member,
    _id: member._id || member.id || '',
    displayName: buildDisplayName(member),
  }
}

export const normalizeHub = (hub) => {
  if (!hub) {
    return null
  }

  const ownerSource =
    hub.ownerProfile ||
    (hub.ownerId && typeof hub.ownerId === 'object' ? hub.ownerId : null) ||
    (hub.owner && typeof hub.owner === 'object' ? hub.owner : null) ||
    null

  return {
    ...hub,
    _id: hub._id || hub.id || '',
    ownerId:
      typeof hub.ownerId === 'string'
        ? hub.ownerId
        : hub.ownerId?._id || hub.owner?._id || hub.ownerId || '',
    ownerProfile: ownerSource ? normalizeMember(ownerSource) : null,
    teachers: Array.isArray(hub.teachers) ? hub.teachers.map(normalizeMember).filter(Boolean) : [],
    admins: Array.isArray(hub.admins) ? hub.admins.map(normalizeMember).filter(Boolean) : [],
    primaryColor: hub.primaryColor || '#0f172a',
    secondaryColor: hub.secondaryColor || '#f59e0b',
  }
}

export const normalizeCourse = (course) => {
  if (!course) {
    return null
  }

  return {
    ...course,
    _id: course._id || course.id || '',
    hubId: course.hubId || '',
    price: Number(course.price || 0),
    isFree: course.isFree ?? Number(course.price || 0) === 0,
    category: course.category || 'Uncategorized',
    level: course.level || 'beginner',
  }
}

export const normalizeModule = (moduleDoc) => {
  if (!moduleDoc) {
    return null
  }

  return {
    ...moduleDoc,
    _id: moduleDoc._id || moduleDoc.id || '',
    courseId: moduleDoc.courseId || '',
    position: Number(moduleDoc.position || 0),
  }
}

export const normalizeLesson = (lesson) => {
  if (!lesson) {
    return null
  }

  const normalizedVideo =
    lesson.video && typeof lesson.video === 'object'
      ? normalizeVideo(lesson.video)
      : lesson.videoId && typeof lesson.videoId === 'object'
        ? normalizeVideo(lesson.videoId)
        : null

  const resolvedVideoId =
    typeof lesson.videoId === 'string'
      ? lesson.videoId
      : lesson.videoId?._id || normalizedVideo?._id || ''

  const legacyVideoUrl = lesson.videoUrl || ''
  const resolvedDuration =
    lesson.duration === undefined || lesson.duration === null
      ? normalizedVideo?.duration ?? null
      : Number(lesson.duration)

  return {
    ...lesson,
    _id: lesson._id || lesson.id || '',
    moduleId: lesson.moduleId || '',
    courseId: lesson.courseId || '',
    title: lesson.title || normalizedVideo?.title || '',
    videoId: resolvedVideoId,
    video: normalizedVideo,
    // Deprecated legacy fallback. Prefer lesson.video?.url for new code paths.
    videoUrl: legacyVideoUrl,
    hlsUrl: normalizedVideo?.hlsUrl || lesson.hlsUrl || '',
    duration: resolvedDuration,
    position: Number(lesson.position || 0),
    isPreview: Boolean(lesson.isPreview),
    videoStatus: normalizedVideo?.status || lesson.videoStatus || '',
    hasAttachedVideo: Boolean(resolvedVideoId || normalizedVideo?.url || legacyVideoUrl),
  }
}

export const normalizeVideo = (video) => {
  if (!video) {
    return null
  }

  return {
    ...video,
    _id: video._id || video.id || '',
    videoType: video.videoType || 'course',
    order: Number(video.order || 0),
    duration: video.duration === undefined || video.duration === null ? null : Number(video.duration),
    videoUrl: video.videoUrl || '',
    hlsUrl: video.hlsUrl || '',
    url: video.url || video.hlsUrl || video.videoUrl || '',
    status: video.status || 'uploading',
  }
}

export const formatPrice = (course) => {
  if (!course || course.isFree || Number(course.price || 0) === 0) {
    return 'Free'
  }

  return `INR ${Number(course.price).toLocaleString()}`
}

export const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('Unable to read the selected file.'))
    reader.readAsDataURL(file)
  })

export const getVideoFileType = (file) => {
  const fileName = file?.name || ''
  const extension = fileName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '')

  if (extension) {
    return extension
  }

  return file?.type?.split('/')[1]?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4'
}

export const request = async (
  endpoint,
  { method = 'GET', token = '', body, headers = {}, signal } = {},
  fallbackMessage = 'Request failed.'
) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      signal,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(buildErrorMessage(payload, fallbackMessage))
    }

    return payload
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Unable to reach the hub services right now.')
    }

    throw error
  }
}

export const fetchMyHub = (token, signal) =>
  request('/hub/me', { token, signal }, 'Failed to load your teacher hub.').then((payload) =>
    normalizeHub(payload?.hub || payload)
  )

export const fetchMyWorkingHubs = (token, signal) =>
  request('/my', { token, signal }, 'Failed to load your hubs.').then((data) =>
    (Array.isArray(data) ? data : []).map(normalizeHub).filter(Boolean)
  )

export const fetchManagedHubBySlug = (token, slug, signal) =>
  request(
    `/hub/${slug}/manage`,
    { token, signal },
    'Failed to load this hub workspace.'
  ).then((payload) => ({
    hub: normalizeHub(payload?.hub || payload),
    role: payload?.role || 'teacher',
  }))

export const fetchPublicHub = (slug, signal) =>
  request(`/hub/${slug}`, { signal }, 'Failed to load this hub.').then(normalizeHub)

export const fetchPublicHubCourses = (hubId, signal) =>
  request(`/courses/hub/${hubId}`, { signal }, 'Failed to load public hub courses.').then((data) =>
    (Array.isArray(data) ? data : []).map(normalizeCourse).filter(Boolean)
  )

export const fetchPublicCourseBySlug = (slug, signal) =>
  request(`/courses/${slug}`, { signal }, 'Failed to load course details.').then(normalizeCourse)

export const fetchManagedHubCourses = (token, hubId, signal) =>
  request(`/courses/hub/${hubId}/manage`, { token, signal }, 'Failed to load hub courses.').then(
    (data) => (Array.isArray(data) ? data : []).map(normalizeCourse).filter(Boolean)
  )

export const fetchManagedCourseById = (token, courseId, signal) =>
  request(`/courses/id/${courseId}/manage`, { token, signal }, 'Failed to load course details.').then(
    normalizeCourse
  )

export const fetchManagedCourseVideos = (token, courseId, signal) =>
  request(`/videos/course/${courseId}/manage`, { token, signal }, 'Failed to load course videos.').then(
    (data) => (Array.isArray(data) ? data : []).map(normalizeVideo).filter(Boolean)
  )

export const fetchManagedHubVideos = (token, hubId, signal) =>
  request(`/videos/hub/${hubId}/manage`, { token, signal }, 'Failed to load hub videos.').then(
    (data) => (Array.isArray(data) ? data : []).map(normalizeVideo).filter(Boolean)
  )

export const fetchPublicHubStandaloneVideos = (hubId, signal) =>
  request(`/videos/hub/${hubId}/standalone`, { signal }, 'Failed to load hub updates.').then((data) =>
    (Array.isArray(data) ? data : []).map(normalizeVideo).filter(Boolean)
  )

export const fetchHubTeam = (token, hubId, signal) =>
  request(`/hub/${hubId}/team`, { token, signal }, 'Failed to load hub team.').then((payload) => ({
    owner: normalizeMember(payload?.owner),
    teachers: Array.isArray(payload?.teachers)
      ? payload.teachers.map(normalizeMember).filter(Boolean)
      : [],
    admins: Array.isArray(payload?.admins) ? payload.admins.map(normalizeMember).filter(Boolean) : [],
  }))

export const addHubTeacher = (token, hubId, payload) =>
  request(`/hub/${hubId}/add-teacher`, { method: 'POST', token, body: payload }, 'Failed to add teacher.')

export const addHubAdmin = (token, hubId, payload) =>
  request(`/hub/${hubId}/add-admin`, { method: 'POST', token, body: payload }, 'Failed to add admin.')

export const updateHubSettings = (token, hubId, payload) =>
  request(
    `/hub/${hubId}/settings`,
    { method: 'PATCH', token, body: payload },
    'Failed to update hub settings.'
  ).then((response) => ({
    ...response,
    hub: normalizeHub(response?.hub),
  }))

export const fetchHubActivity = (token, hubId, signal) =>
  request(`/hub/${hubId}/activity`, { token, signal }, 'Failed to load hub activity.').then((data) =>
    (Array.isArray(data) ? data : []).map((activity) => ({
      ...activity,
      userId: normalizeMember(activity.userId),
    }))
  )

export const createCourse = (token, payload) =>
  request('/courses', { method: 'POST', token, body: payload }, 'Failed to create course.').then(
    normalizeCourse
  )

export const updateCourse = (token, courseId, payload) =>
  request(
    `/courses/${courseId}`,
    { method: 'PATCH', token, body: payload },
    'Failed to update course.'
  ).then(normalizeCourse)

export const publishCourse = (token, courseId) =>
  request(
    `/courses/${courseId}/publish`,
    { method: 'PATCH', token },
    'Failed to publish course.'
  ).then(normalizeCourse)

export const archiveCourse = (token, courseId) =>
  request(
    `/courses/${courseId}/archive`,
    { method: 'PATCH', token },
    'Failed to archive course.'
  ).then(normalizeCourse)

export const fetchModulesByCourse = (token, courseId, signal) =>
  request(`/modules/course/${courseId}`, { token, signal }, 'Failed to load course modules.').then(
    (data) => (Array.isArray(data) ? data.map(normalizeModule).filter(Boolean) : [])
  )

export const fetchLessonsByModule = (token, moduleId, signal) =>
  request(`/lessons/module/${moduleId}`, { token, signal }, 'Failed to load module lessons.').then(
    (data) => (Array.isArray(data) ? data.map(normalizeLesson).filter(Boolean) : [])
  )

export const createModule = (token, payload) =>
  request('/modules', { method: 'POST', token, body: payload }, 'Failed to create module.').then(
    normalizeModule
  )

export const createLesson = (token, payload) =>
  request('/lessons', { method: 'POST', token, body: payload }, 'Failed to create lesson.').then(
    normalizeLesson
  )

export const attachLessonVideo = (token, lessonId, videoId) =>
  request(
    `/lessons/${lessonId}/attach-video`,
    { method: 'PATCH', token, body: { videoId } },
    'Failed to attach video to lesson.'
  ).then(normalizeLesson)

export const requestVideoUploadUrl = (token, payload) =>
  request(
    '/videos/upload-url',
    { method: 'POST', token, body: payload },
    'Failed to prepare the video upload.'
  )

export const uploadVideoFile = async (uploadUrl, file, fileType) => {
  try {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || `video/${fileType}`,
      },
      body: file,
    })

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}.`)
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Unable to upload the video file right now.')
    }

    throw error
  }
}

export const createVideo = (token, payload) =>
  request('/videos', { method: 'POST', token, body: payload }, 'Failed to save the uploaded video.').then(
    normalizeVideo
  )

export const processVideo = (token, videoId) =>
  request(`/videos/${videoId}/process`, { method: 'POST', token }, 'Failed to start video processing.')
