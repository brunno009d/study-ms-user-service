import supabase from '../config/supabase.js'

export const createAuthUser = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
    })

    if (error) throw error
    return data.user
}

export const loginUser = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) throw error
    return data
}

export const getStudentProfile = async (userId) => {
    const { data, error } = await supabase
        .from('student')
        .select('*')
        .eq('id', userId)
        .single()

    if (error) throw error
    return data
}

export const updateStudentProfile = async (userId, updates) => {
    const { data, error } = await supabase
        .from('student')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

    if (error) throw error
    return data
}

export const deleteAuthUser = async (userId) => {
    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) throw error
}
