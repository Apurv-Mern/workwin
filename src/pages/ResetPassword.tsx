import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { API_LIVE_URL } from "../config/BaseUrls";
import { resetPasswordSchema } from "../utils/Validations";

type ResetPasswordForm = {
  newPassword: string;
  confirmPassword: string;
};

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const token = searchParams.get("token");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    if (!token) {
      toast.error("Invalid or missing reset token");
      navigate("/login");
    }
  }, [token, navigate]);

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      toast.error("Invalid reset token");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${API_LIVE_URL}user/reset_password_web`,
        {
          token,
          newPassword: data.newPassword,
          confirmPassword: data.confirmPassword,
        }
      );

      if (response.data.flag) {
        toast.success("Password reset successfully!");
        setIsSuccess(true);
      } else {
        toast.error(response.data.message || "Failed to reset password");
      }
    } catch (error: unknown) {
      console.error("Password reset error:", error);
      let errorMessage = "Something went wrong. Please try again.";

      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
        };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="container">
        <div className="row justify-content-center mt-5">
          <div className="col-md-6 col-lg-4">
            <div className="card shadow">
              <div className="card-body p-4 text-center">
                <h3>Invalid Reset Link</h3>
                <p>The password reset link is invalid or has expired.</p>
                {/* <Link to="/login" className="btn btn-primary">
                  Back to Login
                </Link> */}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success screen
  if (isSuccess) {
    return (
      <div className="container">
        <div className="row justify-content-center mt-5">
          <div className="col-md-6 col-lg-4">
            <div className="card shadow">
              <div className="card-body p-4 text-center">
                <div className="mb-4">
                  <i
                    className="fas fa-check-circle text-success"
                    style={{ fontSize: "4rem" }}
                  ></i>
                </div>
                <h2 className="text-success mb-3">
                  Password Reset Successful!
                </h2>
                <p className="text-muted mb-4">
                  Your password has been successfully updated. Please go and
                  login with your new password.
                </p>
                {/* <Link to="/login" className="btn btn-primary">
                  Go to Login
                </Link> */}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="row justify-content-center mt-5">
        <div className="col-md-6 col-lg-4">
          <div className="card shadow">
            <div className="card-body p-4">
              <h2 className="text-center mb-4">Reset Password</h2>
              <p className="text-center text-muted mb-4">
                Enter your new password below
              </p>

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="mb-3">
                  <label htmlFor="newPassword" className="form-label">
                    New Password
                  </label>
                  <input
                    type="password"
                    className={`form-control ${
                      errors.newPassword ? "is-invalid" : ""
                    }`}
                    id="newPassword"
                    {...register("newPassword")}
                    placeholder="Enter new password"
                  />
                  {errors.newPassword && (
                    <div className="invalid-feedback">
                      {errors.newPassword.message}
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    className={`form-control ${
                      errors.confirmPassword ? "is-invalid" : ""
                    }`}
                    id="confirmPassword"
                    {...register("confirmPassword")}
                    placeholder="Confirm new password"
                  />
                  {errors.confirmPassword && (
                    <div className="invalid-feedback">
                      {errors.confirmPassword.message}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={isLoading}
                >
                  {isLoading ? "Resetting Password..." : "Reset Password"}
                </button>
              </form>

              <div className="mt-3 text-center">
                {/* <Link to="/login" className="text-decoration-none">
                  Back to Login
                </Link> */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
