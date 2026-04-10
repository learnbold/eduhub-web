const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')
const MUTATION_METHODS = new Set(['POST', 'PATCH', 'DELETE'])

const buildIdempotencyKey = (keyPrefix = 'req') =>
  `${keyPrefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`

const omitUndefinedFields = (payload) =>
  Object.fromEntries(Object.entries(payload || {}).filter(([, value]) => value !== undefined))

export const withIdempotency = (headers = {}, keyPrefix = 'req') => {
  if (headers['Idempotency-Key']) {
    return headers
  }

  return {
    ...headers,
    'Idempotency-Key': buildIdempotencyKey(keyPrefix),
  }
}

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

export const normalizeSubscription = (subscription) => {
  if (!subscription) {
    return null
  }

  const normalizedPlan = subscription.plan || 'free'
  const effectivePlan = subscription.effectivePlan || normalizedPlan
  const features = subscription.capabilities?.features || {}

  return {
    ...subscription,
    id: subscription.id || subscription._id || '',
    userId: subscription.userId || '',
    plan: normalizedPlan,
    effectivePlan,
    status: subscription.status || 'active',
    billingCycle: subscription.billingCycle || 'monthly',
    startDate: subscription.startDate || null,
    endDate: subscription.endDate || null,
    trialEndsAt: subscription.trialEndsAt || null,
    lifetimeDeal: Boolean(subscription.lifetimeDeal),
    primaryBatchId: subscription.primaryBatchId || '',
    archivedBatchIds: Array.isArray(subscription.archivedBatchIds)
      ? subscription.archivedBatchIds
      : [],
    capabilities: {
      label: subscription.capabilities?.label || effectivePlan,
      batchLimit:
        subscription.capabilities?.batchLimit === undefined
          ? effectivePlan === 'premium'
            ? null
            : effectivePlan === 'pro'
              ? 5
              : 1
          : subscription.capabilities.batchLimit,
      features: {
        customBranding: Boolean(features.customBranding),
        customDomain: Boolean(features.customDomain),
        bannerAds: Boolean(features.bannerAds),
        teamMembers: Boolean(features.teamMembers),
        analyticsBasic: Boolean(features.analyticsBasic),
        analyticsAdvanced: Boolean(features.analyticsAdvanced),
        prioritySupport: Boolean(features.prioritySupport),
        futureFeatures: Boolean(features.futureFeatures),
      },
    },
    usage: {
      totalBatchCount: Number(subscription.usage?.totalBatchCount || 0),
      activeBatchCount: Number(subscription.usage?.activeBatchCount || 0),
      archivedBatchCount: Number(subscription.usage?.archivedBatchCount || 0),
    },
    notices: {
      batchLimitReached: Boolean(subscription.notices?.batchLimitReached),
      upgradeMessage: subscription.notices?.upgradeMessage || '',
    },
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
    customDomain: hub.customDomain || '',
    subscription: normalizeSubscription(hub.subscription),
  }
}

export const normalizeCourse = (course) => {
  if (!course) {
    return null
  }

  return {
    ...course,
    _id: course._id || course.id || '',
    price: Number(course.price || 0),
    isFree: course.isFree ?? Number(course.price || 0) === 0,
    category: course.category || 'Uncategorized',
    level: course.level || 'beginner',
    hub: course.hub || null,
    hubId:
      typeof course.hubId === 'string'
        ? course.hubId
        : course.hubId?._id || course.hub?.id || course.hub?._id || course.hubId || '',
    videoCount: Number(course.videoCount || course.videosCount || 0),
    videosCount: Number(course.videosCount || course.videoCount || 0),
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

  const normalizedHlsUrl = video.hlsUrl
    ? (video.hlsUrl.startsWith('http') ? video.hlsUrl : `https://cf.sparklass.com/${video.hlsUrl}`)
    : ''

  return {
    ...video,
    _id: video._id || video.id || '',
    videoType: video.videoType || 'course',
    order: Number(video.order || 0),
    duration: video.duration === undefined || video.duration === null ? null : Number(video.duration),
    r2Key: video.r2Key || '',
    hlsUrl: normalizedHlsUrl,
    url: video.url || normalizedHlsUrl || video.videoUrl || '',
    status: video.status || 'uploading',
    thumbnailUrl: video.thumbnailUrl || video.thumbnail || '',
    thumbnail: video.thumbnail || video.thumbnailUrl || '',
    price: video.price || 'Free',
    hub: video.hub || null,
    course: video.course || null,
    views: Number(video.views ?? video.viewsCount ?? 0),
    viewsCount: Number(video.viewsCount ?? video.views ?? 0),
    likesCount: Number(video.likesCount || 0),
    commentsCount: Number(video.commentsCount || 0),
  }
}

export const normalizeComment = (comment) => {
  if (!comment) {
    return null
  }

  const userId =
    comment.userId && typeof comment.userId === 'object'
      ? normalizeMember(comment.userId)
      : comment.userId || ''

  return {
    ...comment,
    _id: comment._id || comment.id || '',
    userId,
    text: comment.text || '',
  }
}

export const normalizeBatch = (batch) => {
  if (!batch) {
    return null
  }

  return {
    ...batch,
    _id: batch._id || batch.id || '',
    id: batch.id || batch._id || '',
    hubId:
      typeof batch.hubId === 'string'
        ? batch.hubId
        : batch.hubId?._id || batch.hubId || '',
    price: Number(batch.price || 0),
    hub: batch.hub || null,
    isPublished: batch.isPublished ?? true,
    planVisibility: batch.planVisibility || 'active',
    planArchivedAt: batch.planArchivedAt || null,
    isPlanArchived: (batch.planVisibility || 'active') === 'archived_by_plan',
    subscriptionType: batch.subscriptionType || 'one_time',
    expiresAt: batch.expiresAt || null,
    courses: Array.isArray(batch.courses) ? batch.courses.map(normalizeCourse).filter(Boolean) : [],
    videos: Array.isArray(batch.videos) ? batch.videos.map(normalizeVideo).filter(Boolean) : [],
    notes: Array.isArray(batch.notes) ? batch.notes : [],
    students: Array.isArray(batch.students) ? batch.students.map(normalizeMember).filter(Boolean) : [],
    enrollments: Array.isArray(batch.enrollments)
      ? batch.enrollments.map((enrollment) => ({
          ...enrollment,
          userId:
            enrollment?.userId && typeof enrollment.userId === 'object'
              ? normalizeMember(enrollment.userId)
              : enrollment?.userId || '',
        }))
      : [],
    courseCount:
      batch.courseCount !== undefined ? Number(batch.courseCount) : Array.isArray(batch.courses) ? batch.courses.length : 0,
    videoCount:
      batch.videoCount !== undefined ? Number(batch.videoCount) : Array.isArray(batch.videos) ? batch.videos.length : 0,
    noteCount:
      batch.noteCount !== undefined ? Number(batch.noteCount) : Array.isArray(batch.notes) ? batch.notes.length : 0,
    studentCount:
      batch.studentCount !== undefined
        ? Number(batch.studentCount)
        : Array.isArray(batch.students)
          ? batch.students.length
          : 0,
    access: {
      canManage: Boolean(batch.access?.canManage),
      isEnrolled: Boolean(batch.access?.isEnrolled),
      role: batch.access?.role || '',
    },
  }
}

export const formatPrice = (course) => {
  if (!course || course.isFree || Number(course.price || 0) === 0) {
    return 'Free'
  }

  return `INR ${Number(course.price).toLocaleString()}`
}

export const formatBatchPrice = (batch) => {
  if (!batch || Number(batch.price || 0) === 0) {
    return 'Free'
  }

  return `INR ${Number(batch.price).toLocaleString()}`
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
  { method = 'GET', token = '', body, headers = {}, signal, idempotencyKey, idempotencyKeyPrefix = 'req' } = {},
  fallbackMessage = 'Request failed.'
) => {
  try {
    const normalizedMethod = String(method || 'GET').toUpperCase()
    const resolvedBody =
      body && typeof body === 'object' && !Array.isArray(body) ? omitUndefinedFields(body) : body
    const baseHeaders = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(resolvedBody ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    }
    const resolvedHeaders = MUTATION_METHODS.has(normalizedMethod)
      ? idempotencyKey
        ? { ...baseHeaders, 'Idempotency-Key': idempotencyKey }
        : withIdempotency(baseHeaders, idempotencyKeyPrefix)
      : baseHeaders

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: normalizedMethod,
      signal,
      headers: resolvedHeaders,
      body: resolvedBody ? JSON.stringify(resolvedBody) : undefined,
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

export const fetchPublicHubPage = async (slug, signal) => {
  const hubPayload = await request(`/hub/${slug}`, { signal }, 'Failed to load this hub.')
  const hub = normalizeHub(hubPayload?.hub || hubPayload)

  if (!hub?._id) {
    return {
      hub,
      batches: [],
      courses: [],
      videos: [],
    }
  }

  const payload = await request(`/hubs/${hub._id}/public`, { signal }, 'Failed to load this hub.')

  return {
    hub: normalizeHub(payload?.hub || hub),
    batches: (Array.isArray(payload?.batches) ? payload.batches : []).map(normalizeBatch).filter(Boolean),
    courses: (Array.isArray(payload?.courses) ? payload.courses : []).map(normalizeCourse).filter(Boolean),
    videos: (Array.isArray(payload?.videos) ? payload.videos : []).map(normalizeVideo).filter(Boolean),
  }
}

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

export const fetchManagedHubBatches = (token, hubId, signal) =>
  request(`/batches/hub/${hubId}`, { token, signal }, 'Failed to load hub batches.').then((data) =>
    (Array.isArray(data) ? data : []).map(normalizeBatch).filter(Boolean)
  )

export const fetchManagedBatchById = (token, batchId, signal) =>
  request(`/batches/${batchId}`, { token, signal }, 'Failed to load batch details.').then(normalizeBatch)

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

export const fetchGlobalVideos = (signal, page = 1, limit = 12) =>
  request(`/videos?page=${page}&limit=${limit}`, { signal }, 'Failed to load videos.').then((data) => {
    const items = data && data.videos ? data.videos : Array.isArray(data) ? data : [];
    return items.map(normalizeVideo).filter(Boolean);
  })

export const fetchGlobalVideoById = (videoId, signal) =>
  request(`/videos/${videoId}`, { signal }, 'Failed to load video.').then(normalizeVideo)

export const fetchExploreContent = (signal) =>
  request('/explore', { signal }, 'Failed to load recommendations.').then((payload) => ({
    videos: (Array.isArray(payload?.videos) ? payload.videos : []).map(normalizeVideo).filter(Boolean),
    courses: (Array.isArray(payload?.courses) ? payload.courses : []).map(normalizeCourse).filter(Boolean),
    batches: (Array.isArray(payload?.batches) ? payload.batches : []).map(normalizeBatch).filter(Boolean),
  }))

export const fetchHubTeam = (token, hubId, signal) =>
  request(`/hub/${hubId}/team`, { token, signal }, 'Failed to load hub team.').then((payload) => ({
    owner: normalizeMember(payload?.owner),
    teachers: Array.isArray(payload?.teachers)
      ? payload.teachers.map(normalizeMember).filter(Boolean)
      : [],
    admins: Array.isArray(payload?.admins) ? payload.admins.map(normalizeMember).filter(Boolean) : [],
  }))

export const addHubTeacher = (token, hubId, payload) =>
  request(
    `/hub/${hubId}/add-teacher`,
    { method: 'POST', token, body: payload, headers: withIdempotency({}, 'hub-teacher') },
    'Failed to add teacher.'
  )

export const addHubAdmin = (token, hubId, payload) =>
  request(
    `/hub/${hubId}/add-admin`,
    { method: 'POST', token, body: payload, headers: withIdempotency({}, 'hub-admin') },
    'Failed to add admin.'
  )

export const updateHubSettings = (token, hubId, payload) =>
  request(
    `/hub/${hubId}/settings`,
    { method: 'PATCH', token, body: payload, headers: withIdempotency({}, 'hub-settings') },
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
  request(
    '/courses',
    {
      method: 'POST',
      token,
      body: payload,
      headers: withIdempotency({}, 'course'),
    },
    'Failed to create course.'
  ).then(normalizeCourse)

export const createBatch = (token, payload) =>
  request(
    '/batches',
    { method: 'POST', token, body: payload, headers: withIdempotency({}, 'batch') },
    'Failed to create batch.'
  ).then(
    normalizeBatch
  )

export const updateBatch = (token, batchId, payload) =>
  request(
    `/batches/${batchId}`,
    { method: 'PATCH', token, body: payload, headers: withIdempotency({}, 'batch-update') },
    'Failed to update batch.'
  ).then(
    normalizeBatch
  )

export const addCourseToBatch = (token, batchId, courseId) =>
  request(
    `/batches/${batchId}/courses`,
    { method: 'POST', token, body: { courseId }, headers: withIdempotency({}, 'batch-course') },
    'Failed to add course to batch.'
  ).then(normalizeBatch)

export const addVideoToBatch = (token, batchId, videoId) =>
  request(
    `/batches/${batchId}/videos`,
    { method: 'POST', token, body: { videoId }, headers: withIdempotency({}, 'batch-video') },
    'Failed to add video to batch.'
  ).then(normalizeBatch)

export const removeCourseFromBatch = (token, batchId, courseId) =>
  request(
    `/batches/${batchId}/courses/${courseId}`,
    { method: 'DELETE', token },
    'Failed to remove course from batch.'
  ).then(normalizeBatch)

export const removeVideoFromBatch = (token, batchId, videoId) =>
  request(
    `/batches/${batchId}/videos/${videoId}`,
    { method: 'DELETE', token },
    'Failed to remove video from batch.'
  ).then(normalizeBatch)

export const enrollInBatch = (token, batchId) =>
  request(
    `/batches/${batchId}/enroll`,
    { method: 'POST', token, headers: withIdempotency({}, 'batch-enroll') },
    'Failed to enroll in batch.'
  ).then(
    (response) => ({
      ...response,
      batch: normalizeBatch(response?.batch),
    })
  )

export const updateCourse = (token, courseId, payload) =>
  request(
    `/courses/${courseId}`,
    { method: 'PATCH', token, body: payload, headers: withIdempotency({}, 'course-update') },
    'Failed to update course.'
  ).then(normalizeCourse)

export const publishCourse = (token, courseId) =>
  request(
    `/courses/${courseId}/publish`,
    { method: 'PATCH', token, headers: withIdempotency({}, 'publish') },
    'Failed to publish course.'
  ).then(normalizeCourse)

export const archiveCourse = (token, courseId) =>
  request(
    `/courses/${courseId}/archive`,
    { method: 'PATCH', token, headers: withIdempotency({}, 'course-archive') },
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
  request(
    '/modules',
    { method: 'POST', token, body: payload, headers: withIdempotency({}, 'module') },
    'Failed to create module.'
  ).then(
    normalizeModule
  )

export const createLesson = (token, payload) =>
  request(
    '/lessons',
    { method: 'POST', token, body: payload, headers: withIdempotency({}, 'lesson') },
    'Failed to create lesson.'
  ).then(
    normalizeLesson
  )

export const updateLesson = (token, lessonId, payload) =>
  request(
    `/lessons/${lessonId}`,
    { method: 'PATCH', token, body: payload, headers: withIdempotency({}, 'lesson-update') },
    'Failed to update lesson.'
  ).then(normalizeLesson)

export const attachLessonVideo = (token, lessonId, videoId) =>
  request(
    `/lessons/${lessonId}/attach-video`,
    { method: 'PATCH', token, body: { videoId }, headers: withIdempotency({}, 'lesson-video') },
    'Failed to attach video to lesson.'
  ).then(normalizeLesson)

export const requestVideoUploadUrl = (token, payload) =>
  request(
    '/videos/upload-url',
    { method: 'POST', token, body: payload, headers: withIdempotency({}, 'video-upload') },
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
  request(
    '/videos',
    {
      method: 'POST',
      token,
      body: payload,
      headers: withIdempotency({}, 'video'),
    },
    'Failed to save the uploaded video.'
  ).then(normalizeVideo)

export const processVideo = (token, videoId) =>
  request(
    `/videos/${videoId}/process`,
    {
      method: 'POST',
      token,
      idempotencyKey: buildIdempotencyKey(`process-${videoId}`),
    },
    'Failed to start video processing.'
  )

export const incrementVideoView = (videoId) =>
  request(`/videos/${videoId}/view`, { method: 'POST' }, 'Failed to record video view.')

export const toggleVideoLike = (token, videoId) =>
  request(
    `/videos/${videoId}/like`,
    {
      method: 'POST',
      token,
    },
    'Failed to update like.'
  )

export const fetchVideoComments = (videoId, page = 1, signal) =>
  request(
    `/videos/${videoId}/comments?page=${page}`,
    {
      signal,
    },
    'Failed to load comments.'
  ).then((data) => (Array.isArray(data) ? data.map(normalizeComment).filter(Boolean) : []))

export const addVideoComment = (token, videoId, text) =>
  request(
    `/videos/${videoId}/comments`,
    {
      method: 'POST',
      token,
      body: { text },
    },
    'Failed to post comment.'
  ).then(normalizeComment)

export const deleteVideoComment = (token, commentId) =>
  request(
    `/comments/${commentId}`,
    {
      method: 'DELETE',
      token,
    },
    'Failed to delete comment.'
  )

export const fetchVideoStatus = (token, videoId, signal) =>
  request(
    `/videos/${videoId}/status`,
    {
      token,
      signal,
    },
    'Failed to load video status.'
  )
