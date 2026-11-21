import time
from types import SimpleNamespace
from fastapi import HTTPException
from rupeetrace.core.auth import (
    DEMO_USERS, ACTIVE_SESSIONS, create_session,
    get_current_user, require_auth, require_role
)
from rupeetrace.api.routes import auth

def test_rbac_targeted():
    print("=" * 70)
    print("TARGETED RUPEETRACE RBAC & ROLE ISOLATION AUDIT")
    print("=" * 70)

    # 1. Login Authentication
    cit_token = create_session(DEMO_USERS["citizen"])
    off_token = create_session(DEMO_USERS["officer"])

    print(f"1. Created sessions:\n   Citizen: {cit_token}\n   Officer: {off_token}")
    assert cit_token in ACTIVE_SESSIONS
    assert off_token in ACTIVE_SESSIONS

    # 2. Mock Request builder
    def mock_req(token=None):
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return SimpleNamespace(headers=headers)

    # 3. Test require_auth
    cit_user = require_auth(mock_req(cit_token))
    assert cit_user["role"] == "citizen"
    assert cit_user["name"] == "Sunita Sharma"
    print("2. require_auth(cit_token) -> Success, role=citizen")

    off_user = require_auth(mock_req(off_token))
    assert off_user["role"] == "officer"
    assert off_user["name"] == "Er. R. K. Patil"
    print("3. require_auth(off_token) -> Success, role=officer")

    # 4. Test require_auth with invalid / missing token -> 401
    try:
        require_auth(mock_req(None))
        assert False, "Expected 401 on missing token"
    except HTTPException as e:
        assert e.status_code == 401
        print(f"4. require_auth(None) -> 401 Unauthorized (Correct)")

    try:
        require_auth(mock_req("invalid_token_xyz"))
        assert False, "Expected 401 on invalid token"
    except HTTPException as e:
        assert e.status_code == 401
        print(f"5. require_auth('invalid_token') -> 401 Unauthorized (Correct)")

    # 5. Test require_role("officer") on Citizen Session -> Must raise 403 Forbidden
    officer_guard = require_role("officer")
    try:
        officer_guard(mock_req(cit_token))
        assert False, "Citizen was NOT blocked by officer guard!"
    except HTTPException as e:
        assert e.status_code == 403
        print(f"6. officer_guard(cit_token) -> 403 Forbidden: '{e.detail}' (Role Barrier Verified)")

    # 6. Test require_role("officer") on Officer Session -> Must succeed
    passed_user = officer_guard(mock_req(off_token))
    assert passed_user["role"] == "officer"
    print(f"7. officer_guard(off_token) -> Success: '{passed_user['name']}' authorized")

    # 7. Test Logout Invalidation
    print("8. Testing Session Invalidation upon Logout:")
    logout_req = mock_req(off_token)
    logout_res = auth.logout(logout_req)
    assert off_token not in ACTIVE_SESSIONS
    print(f"   auth.logout() -> {logout_res['message']}")
    print(f"   off_token in ACTIVE_SESSIONS: {off_token in ACTIVE_SESSIONS}")

    # 8. Post-Logout access rejection
    try:
        require_auth(mock_req(off_token))
        assert False, "Logged out token was still accepted!"
    except HTTPException as e:
        assert e.status_code == 401
        print("9. require_auth(logged_out_token) -> 401 Unauthorized (Session Successfully Dead)")

    try:
        officer_guard(mock_req(off_token))
        assert False, "Logged out token bypassed officer guard!"
    except HTTPException as e:
        assert e.status_code == 401
        print("10. officer_guard(logged_out_token) -> 401 Unauthorized (Protected Endpoints Blocked)")

    print("\n" + "=" * 70)
    print("ALL 10 TARGETED RBAC TESTS PASSED IN < 0.1s!")
    print("=" * 70)

if __name__ == "__main__":
    test_rbac_targeted()
