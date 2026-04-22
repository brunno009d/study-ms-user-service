const supabase = require('../config/supabase');

/**
 * Registra un nuevo usuario en Supabase Auth
 * El trigger 'on_auth_user_created' crea automáticamente la fila en 'student'
 * usando raw_user_meta_data->>'full_name'
 */
const createAuthUser = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
    });

    if (error) throw error;
    return data.user;
};

/**
 * Login con email y contraseña usando Supabase Auth
 */
const loginUser = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) throw error;
    return data;
};

// NOTA: No se necesita createStudentProfile
// El trigger 'on_auth_user_created' en Supabase crea automáticamente
// la fila en 'student' al registrar un usuario en Auth

/**
 * Obtiene el perfil del estudiante por su ID
 */
const getStudentProfile = async (userId) => {
    const { data, error } = await supabase
        .from('student')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) throw error;
    return data;
};

/**
 * Actualiza el perfil del estudiante
 */
const updateStudentProfile = async (userId, updates) => {
    const { data, error } = await supabase
        .from('student')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Elimina el usuario de Supabase Auth (cascade elimina el perfil)
 */
const deleteAuthUser = async (userId) => {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;
};

module.exports = {
    createAuthUser,
    loginUser,
    getStudentProfile,
    updateStudentProfile,
    deleteAuthUser
};
