function getUserFromRequest(request) {
  const principalHeader = request.headers.get("x-ms-client-principal");

  if (!principalHeader) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(principalHeader, "base64").toString("ascii")
    );

    return {
      userId: decoded.userId || null,
      userDetails: decoded.userDetails || null,
      identityProvider: decoded.identityProvider || null,
      roles: decoded.userRoles || []
    };
  } catch (error) {
    return null;
  }
}

function hasRole(user, roleName) {
  return Array.isArray(user?.roles) && user.roles.includes(roleName);
}

function isAdmin(user) {
  return hasRole(user, "admin");
}

function isEmployee(user) {
  return hasRole(user, "employee") || hasRole(user, "admin");
}

function isCustomer(user) {
  return hasRole(user, "customer");
}

function requireUser(request) {
  const user = getUserFromRequest(request);

  if (!user || !user.userId) {
    return {
      ok: false,
      response: {
        status: 401,
        jsonBody: { error: "Unauthorized" }
      }
    };
  }

  return {
    ok: true,
    user
  };
}

module.exports = {
  getUserFromRequest,
  hasRole,
  isAdmin,
  isEmployee,
  isCustomer,
  requireUser
};
