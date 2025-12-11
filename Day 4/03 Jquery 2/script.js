$("#add").click(function () {
  let task = $("#task").val();
  $("#tasklist").append("<li>" + task);
});