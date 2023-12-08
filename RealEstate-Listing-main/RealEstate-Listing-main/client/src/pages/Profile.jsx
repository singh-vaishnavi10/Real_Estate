import { useSelector } from "react-redux";
import { useRef, useState, useEffect } from "react";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { app } from "../firebase";
import {
  updateUserStart,
  updateUserSuccess,
  updateUserFailure,
  deleteUserStart,
  deleteUserFailure,
  deleteUserSuccess,
  signOutUserFailure,
  signOutUserSuccess,
  signOutUserStart,
} from "../redux/user/userSlice";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
export default function Profile() {
  const fileRef = useRef(null);
  const { currentUser, loading, error } = useSelector((state) => state.user);
  const [file, setFile] = useState(undefined);
  const [filePerc, setFilePerc] = useState(0);
  const [fileUploadError, setFileUploadError] = useState(false);
  const [formData, setFormData] = useState({});
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const dispatch = useDispatch();
  const [showListingsError, setShowListingsError] = useState(false);
  const [userListings, setUserListings] = useState([]);
  // firebase storage
  // allow read;
  // allow write: if
  // request.resource.size < 2 * 1024 * 1024 &&
  // request.resource.contentType.matches('image/.*')

  useEffect(() => {
    if (file) {
      handleFileUpload(file);
    }
  }, [file]);

  const handleFileUpload = (file) => {
    const storage = getStorage(app);
    const fileName = new Date().getTime() + file.name;
    const storageRef = ref(storage, fileName);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setFilePerc(Math.round(progress));
      },
      (error) => {
        setFileUploadError(true);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) =>
          setFormData({ ...formData, avatar: downloadURL })
        );
      }
    );
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      dispatch(updateUserStart());
      const res = await fetch(`/api/update/${currentUser._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success === false) {
        dispatch(updateUserFailure(data.message));
        return;
      }

      dispatch(updateUserSuccess(data));
      setUpdateSuccess(true);
    } catch (error) {
      dispatch(updateUserFailure(error.message));
    }
  };
  const handleDeleteUser = async () => {
    try {
      dispatch(deleteUserStart());
      const res = await fetch(`/api/delete/${currentUser._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success === false) {
        dispatch(deleteUserFailure(data.message));
        return;
      }
      dispatch(deleteUserSuccess(data));
      console.log("User deleted");
    } catch (error) {
      dispatch(deleteUserFailure(error.message));
    }
  };
  const handleSignOut = async () => {
    try {
      dispatch(signOutUserStart());
      const res = await fetch("/api/auth/signout");
      if (!res.ok) {
        throw new Error(res.statusText);
      }
      const data = await res.json();
      if (data.success === false) {
        dispatch(signOutUserFailure(data.message));
        return;
      }
      dispatch(signOutUserSuccess(data));
      // console.log("Signed out")
    } catch (error) {
      dispatch(signOutUserFailure(error.message));
    }
  };
  const handleShowListings = async () => {
    try {
      setShowListingsError(false);
      const res = await fetch(`/api/listings/${currentUser._id}`);
      const data = await res.json();
      if (data.success === false) {
        setShowListingsError(true);
        return;
      }

      setUserListings(data);
    } catch (error) {
      setShowListingsError(true);
    }
  };
  const handleListingDelete = async (listingId) => {
    try {
      const res = await fetch(`/api/listing/delete/${listingId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success === false) {
        return;
      }
      setUserListings((p) => p.filter((listing) => listing._id) !== listingId);
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <div className="bg-violet-100 ">
      <div className=" p-3 max-w-lg mx-auto">
        <h1 className="text-3xl font-semibold text-center my-7">Profile</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            onChange={(e) => setFile(e.target.files[0])}
            type="file"
            ref={fileRef}
            hidden
            accept="image/*"
          />
          <img
            onClick={() => fileRef.current.click()}
            src={formData.avatar || currentUser.avatar}
            alt="profile"
            className="rounded-full h-24 w-24 object-cover cursor-pointer self-center mt-2"
          />
          <p className="text-sm self-center">
            {fileUploadError ? (
              <span className="text-red-700">
                Error Image upload (image must be less than 2 mb)
              </span>
            ) : filePerc > 0 && filePerc < 100 ? (
              <span className="text-slate-700">{`Uploading ${filePerc}%`}</span>
            ) : filePerc === 100 ? (
              <div className="text-white px-6 py-2 border-0 rounded relative mb-4 bg-emerald-500">
                <span className="text-xl inline-block mr-5 align-middle">
                  <i className="fas fa-bell" />
                </span>
                <span className="inline-block align-middle mr-8">
                  <b className="capitalize">Image Updated Successfully</b>
                </span>
                <button
                  className="absolute bg-transparent text-2xl font-semibold leading-none right-0 top-0 mt-1 mr-6 outline-none focus:outline-none"
                  onClick={() => setFilePerc(0)} // Add this line
                >
                  <span>×</span>
                </button>
              </div>
            ) : (
              ""
            )}
          </p>
          <input
            type="text"
            placeholder="Username"
            defaultValue={currentUser.username}
            id="userName"
            className="border p-3 rounded-lg"
            onChange={handleChange}
          />
          <input
            type="email"
            placeholder="email"
            id="email"
            defaultValue={currentUser.email}
            className="border p-3 rounded-lg"
            onChange={handleChange}
          />
          <input
            type="password"
            placeholder="password"
            onChange={handleChange}
            id="password"
            className="border p-3 rounded-lg"
          />
          <button
            disabled={loading}
            className="bg-slate-700 text-white rounded-lg p-3 text-lg  hover:shadow-lg hover:opacity-95 disabled:opacity-80"
          >
            {loading ? "Loading..." : "Update"}
          </button>
          <Link
            className="bg-green-600 text-white p-3 rounded-lg text-lg text-center hover:shadow-lg hover:opacity-95"
            to={"/create-listing"}
          >
            Create Listing
          </Link>
        </form>
        <div className="flex justify-between mt-5">
          <button
            onClick={handleDeleteUser}
            className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-700 hover:shadow-lg"
          >
            Delete account
          </button>
          <button
            onClick={handleSignOut}
            className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-700 hover:shadow-lg"
          >
            Sign out
          </button>
        </div>

        <p className="text-red-700 mt-5">{error ? error : ""}</p>
        <p className="text-green-700 mt-5">
          {updateSuccess ? (
            <div className="text-white px-6 py-2 border-0 rounded relative mb-4 bg-emerald-500">
              <span className="text-xl inline-block mr-5 align-middle">
                <i className="fas fa-bell" />
              </span>
              <span className="inline-block align-middle mr-8">
                <b className="capitalize">Profile Updated Successfully</b>
              </span>
              <button
                className="absolute bg-transparent text-2xl font-semibold leading-none right-0 top-0 mt-1 mr-6 outline-none focus:outline-none"
                onClick={() => setUpdateSuccess(false)} // Add this line
              >
                <span>×</span>
              </button>
            </div>
          ) : (
            ""
          )}
        </p>
        <button
          onClick={handleShowListings}
          className="text-teal-700 text-lg w-full hover:underline"
        >
          Show Listings
        </button>
        <p className="text-red-700 mt-5">
          {showListingsError ? "Error showing listings" : ""}
        </p>

        {userListings && userListings.length > 0 && (
          <div className="bg-violet-200 rounded-xl flex flex-col gap-4">
            <h1 className="text-center mt-7 text-slate-950 text-2xl font-semibold">
              Your Listings
            </h1>
            {userListings.map((listing) => (
              <div
                key={listing._id}
                className="border rounded-lg p-3 flex justify-between items-center gap-4"
              >
                <Link to={`/listing/${listing._id}`}>
                  <img
                    src={listing.imageUrls[0]}
                    alt="listing cover"
                    className="h-20 w-20 object-contain"
                  />
                </Link>
                <Link
                  className="text-slate-700 font-semibold  hover:underline truncate flex-1"
                  to={`/listing/${listing._id}`}
                >
                  <h1>{listing.name}</h1>
                </Link>

                <div className="flex flex-col item-center">
                  <button
                    onClick={() => handleListingDelete(listing._id)}
                    className="text-red-700 text-lg hover:underline"
                  >
                    Delete
                  </button>
                  <Link to={`/update-listing/${listing._id}`}>
                    <button className="text-green-700 text-lg hover:underline">
                      Edit
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
